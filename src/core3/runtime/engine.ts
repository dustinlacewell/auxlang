/**
 * The core3 engine: an interpreted per-sample walk over a compiled Program.
 * One interpreter, two hosts (offline renderer, AudioWorklet).
 *
 * Build allocates everything: lane states (fresh or migrated), the flat
 * double-buffered output values, reused ins/outs records, compiled input
 * bindings/gathers, hydrated lambdas. `tick` flips the two buffers (no copy),
 * walks nodes in program (topo) order, and sums the out-nodes' l/r — it
 * allocates nothing.
 */

import type {
	Engine,
	EngineCtor,
	EngineState,
	ModuleSpec,
	Program,
	ReduceTickFn,
	Registry,
	TickFn,
} from "../types";
import {
	BIND_CONST,
	BIND_CUR,
	BIND_LAMBDA,
	type LaneBindings,
	compileLaneBindings,
} from "./bindings";
import { deepClone } from "./deep-clone";
import {
	GATHER_CONST,
	GATHER_CUR,
	GATHER_LAMBDA,
	type ReduceGathers,
	compileReduceGathers,
} from "./gathers";
import { buildLaneStates } from "./initial-states";
import type { LambdaSlot } from "./lambda";
import { type OutputLayout, buildOutputLayout, slotOf } from "./output-slots";

interface NodeRun {
	readonly tick: TickFn | ReduceTickFn;
	readonly config: Record<string, unknown>;
	readonly laneCount: number;
	readonly states: Record<string, unknown>[];
	/** Reused across lanes and samples. */
	readonly ins: Record<string, number> & Record<string, Float32Array | number>;
	readonly outs: Record<string, number>;
	readonly outPorts: readonly string[];
	/** outBases[j] + lane = slot of outPorts[j]. */
	readonly outBases: Int32Array;
	/** Per-lane bindings for map nodes; null for reduce. */
	readonly bindings: readonly LaneBindings[] | null;
	/** Gathers for reduce nodes; null for map. */
	readonly gathers: ReduceGathers | null;
}

export class Core3Engine implements Engine {
	private readonly runs: NodeRun[];
	private readonly keys: readonly string[];
	private readonly sr: number;
	private cur: Float64Array;
	private prv: Float64Array;
	private readonly outSlotsL: Int32Array;
	private readonly outSlotsR: Int32Array;
	private count: number;
	readonly layout: OutputLayout;

	constructor(program: Program, sampleRate: number, registry: Registry, prev?: EngineState) {
		this.sr = sampleRate;
		this.count = prev?.sampleCount ?? 0;
		this.layout = buildOutputLayout(program.nodes, registry);
		this.cur = new Float64Array(this.layout.size);
		this.prv = new Float64Array(this.layout.size);

		const specs = program.nodes.map((n) => registry.get(n.module) as ModuleSpec);
		const laneStates = buildLaneStates(program.nodes, specs, sampleRate, prev);
		this.keys = laneStates.keys;

		this.runs = program.nodes.map((node, i) => {
			const spec = specs[i] as ModuleSpec;
			const reduce = spec.policy === "reduce";
			if (reduce && node.lanes.length !== 1) {
				throw new Error(
					`node #${i} ('${node.module}') is reduce policy but has ${node.lanes.length} lanes`,
				);
			}
			if (!reduce && node.lanes.length !== node.width) {
				throw new Error(
					`node #${i} ('${node.module}') width ${node.width} does not match ${node.lanes.length} lane records`,
				);
			}
			const outPorts = Object.keys(spec.outs);
			const outBases = new Int32Array(outPorts.length);
			outPorts.forEach((port, j) => {
				outBases[j] = (this.layout.bases[i] as Record<string, number>)[port] as number;
			});
			const outs: Record<string, number> = {};
			for (const port of outPorts) outs[port] = 0;
			const ins: Record<string, number> = {};
			for (const port of Object.keys(spec.ins)) ins[port] = 0;
			return {
				tick: spec.tick,
				config: node.config,
				laneCount: node.lanes.length,
				states: laneStates.states[i] as Record<string, unknown>[],
				ins,
				outs,
				outPorts,
				outBases,
				bindings: reduce
					? null
					: node.lanes.map((_, lane) => compileLaneBindings(node, i, spec, this.layout, lane)),
				gathers: reduce ? compileReduceGathers(node, i, spec, this.layout) : null,
			};
		});

		this.outSlotsL = new Int32Array(program.outs.length);
		this.outSlotsR = new Int32Array(program.outs.length);
		program.outs.forEach((nodeIndex, j) => {
			this.outSlotsL[j] = slotOf(this.layout, nodeIndex, "l", 0);
			this.outSlotsR[j] = slotOf(this.layout, nodeIndex, "r", 0);
		});
	}

	get sampleCount(): number {
		return this.count;
	}

	tick(out: Float32Array): void {
		const flip = this.prv;
		this.prv = this.cur;
		this.cur = flip;
		const cur = this.cur;
		const prv = this.prv;
		const sr = this.sr;
		const time = this.count / sr;

		const runs = this.runs;
		for (let i = 0; i < runs.length; i++) {
			const r = runs[i] as NodeRun;
			if (r.gathers === null) this.tickMap(r, cur, prv, sr, time);
			else this.tickReduce(r, cur, prv, sr, time);
		}

		let sumL = 0;
		let sumR = 0;
		const sl = this.outSlotsL;
		const srr = this.outSlotsR;
		for (let j = 0; j < sl.length; j++) {
			sumL += cur[sl[j] as number] as number;
			sumR += cur[srr[j] as number] as number;
		}
		out[0] = sumL;
		out[1] = sumR;
		this.count++;
	}

	private tickMap(
		r: NodeRun,
		cur: Float64Array,
		prv: Float64Array,
		sr: number,
		time: number,
	): void {
		const bindings = r.bindings as readonly LaneBindings[];
		const ins = r.ins;
		const outs = r.outs;
		const outPorts = r.outPorts;
		const outBases = r.outBases;
		for (let lane = 0; lane < r.laneCount; lane++) {
			const b = bindings[lane] as LaneBindings;
			const names = b.names;
			const kinds = b.kinds;
			const offsets = b.offsets;
			const consts = b.consts;
			for (let j = 0; j < names.length; j++) {
				const k = kinds[j];
				let v: number;
				if (k === BIND_CONST) v = consts[j] as number;
				else if (k === BIND_CUR) v = cur[offsets[j] as number] as number;
				else if (k === BIND_LAMBDA) {
					const slot = b.lambdas[j] as LambdaSlot;
					v = slot.fn(slot.state, sr, time);
				} else v = prv[offsets[j] as number] as number;
				ins[names[j] as string] = v;
			}
			(r.tick as TickFn)(r.states[lane] as Record<string, unknown>, ins, outs, r.config, sr);
			for (let j = 0; j < outPorts.length; j++) {
				cur[(outBases[j] as number) + lane] = outs[outPorts[j] as string] as number;
			}
		}
	}

	private tickReduce(
		r: NodeRun,
		cur: Float64Array,
		prv: Float64Array,
		sr: number,
		time: number,
	): void {
		const g = r.gathers as ReduceGathers;
		const ins = r.ins as Record<string, Float32Array | number>;
		const ports = g.ports;
		for (let j = 0; j < ports.length; j++) {
			const p = ports[j] as (typeof ports)[number];
			if (p.kind === GATHER_CONST) ins[p.name] = p.constValue;
			else if (p.kind === GATHER_LAMBDA) {
				const slot = p.lambda as LambdaSlot;
				ins[p.name] = slot.fn(slot.state, sr, time);
			} else {
				const buf = p.kind === GATHER_CUR ? cur : prv;
				const view = p.view as Float32Array;
				const base = p.base;
				const srcLanes = p.srcLanes;
				for (let l = 0; l < view.length; l++) view[l] = buf[base + (l % srcLanes)] as number;
				ins[p.name] = view;
			}
		}
		(r.tick as ReduceTickFn)(
			r.states[0] as Record<string, unknown>,
			ins,
			r.outs,
			r.config,
			sr,
			g.width,
		);
		const outPorts = r.outPorts;
		const outBases = r.outBases;
		for (let j = 0; j < outPorts.length; j++) {
			cur[outBases[j] as number] = r.outs[outPorts[j] as string] as number;
		}
	}

	collectState(): EngineState {
		const nodes: Record<string, Record<string, unknown>[]> = {};
		this.runs.forEach((r, i) => {
			nodes[this.keys[i] as string] = r.states.map((s) => deepClone(s));
		});
		return { nodes, sampleCount: this.count };
	}

	/** Read a node's output for the sample just ticked. Test/tap hook, not part of the Engine contract. */
	peek(node: number, port: string, lane: number): number {
		return this.cur[slotOf(this.layout, node, port, lane)] as number;
	}
}

export const createEngine: EngineCtor = (program, sampleRate, registry, prev) =>
	new Core3Engine(program, sampleRate, registry, prev);
