/**
 * The core3 engine: a per-sample walk over a compiled Program.
 * One engine, two hosts (offline renderer, AudioWorklet).
 *
 * Build allocates everything: lane states (fresh or migrated), the flat
 * double-buffered output values, reused ins/outs records, compiled input
 * bindings/gathers, hydrated lambdas — then picks the driver that walks them
 * (interpreter, or the generated driver when `codegen` is on). `tick` flips
 * the two buffers (no copy), runs the driver over nodes in program (topo)
 * order, and sums the out-nodes' l/r — it allocates nothing.
 */

import type { Engine, EngineCtor, EngineState, ModuleSpec, Program, Registry } from "../types";
import { compileLaneBindings } from "./bindings";
import { deepClone } from "./deep-clone";
import type { Driver } from "./driver";
import { compileReduceGathers } from "./gathers";
import { buildLaneStates } from "./initial-states";
import type { NodeRun } from "./node-run";
import { type OutputLayout, buildOutputLayout, slotOf } from "./output-slots";
import { selectDriver } from "./select-driver";

export interface EngineOptions {
	/** Run a generated per-program driver instead of the interpreter. Default off. */
	readonly codegen?: boolean;
}

export class Core3Engine implements Engine {
	private readonly runs: NodeRun[];
	private readonly driver: Driver;
	private readonly keys: readonly string[];
	private readonly sr: number;
	private cur: Float64Array;
	private prv: Float64Array;
	private readonly outSlotsL: Int32Array;
	private readonly outSlotsR: Int32Array;
	private count: number;
	readonly layout: OutputLayout;

	constructor(
		program: Program,
		sampleRate: number,
		registry: Registry,
		prev?: EngineState,
		options: EngineOptions = {},
	) {
		this.sr = sampleRate;
		this.count = prev?.sampleCount ?? 0;
		this.layout = buildOutputLayout(program.nodes, registry);
		this.cur = new Float64Array(this.layout.size);
		this.prv = new Float64Array(this.layout.size);

		const specs = program.nodes.map((n) => registry.get(n.module) as ModuleSpec);
		const laneStates = buildLaneStates(program.nodes, specs, sampleRate, program.seed, prev);
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
				config: { ...spec.config, ...node.config },
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

		this.driver = selectDriver(this.runs, options.codegen ?? false);
	}

	get sampleCount(): number {
		return this.count;
	}

	tick(out: Float32Array): void {
		const flip = this.prv;
		this.prv = this.cur;
		this.cur = flip;
		const cur = this.cur;
		this.driver(cur, this.prv, this.sr, this.count / this.sr);

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

	/** Lane states to carry, minus each lane's scratch (derived data, never carried). */
	collectState(): EngineState {
		const nodes: Record<string, Record<string, unknown>[]> = {};
		this.runs.forEach((r, i) => {
			const key = this.keys[i] as string;
			nodes[key] = r.states.map(({ __scratch: _scratch, ...carried }) => deepClone(carried));
		});
		return { nodes, sampleRate: this.sr, sampleCount: this.count };
	}

	/** Read a node's output for the sample just ticked. Test/tap hook, not part of the Engine contract. */
	peek(node: number, port: string, lane: number): number {
		return this.cur[slotOf(this.layout, node, port, lane)] as number;
	}
}

export const createEngine: EngineCtor = (program, sampleRate, registry, prev) =>
	new Core3Engine(program, sampleRate, registry, prev);
