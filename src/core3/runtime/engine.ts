/**
 * The core3 engine: a per-sample walk over a compiled Program, run a block
 * at a time. One engine, two hosts (offline renderer, AudioWorklet).
 *
 * Build allocates everything: lane states (fresh or migrated), the flat
 * double-buffered output values, reused ins/outs records, compiled input
 * bindings/gathers, hydrated lambdas — then picks the driver that walks them
 * (interpreter, or the generated driver when `codegen` is on). `renderBlock`
 * runs the driver over n samples (per sample: flip the buffers, walk nodes in
 * program (topo) order, sum the out-nodes' l/r); `tick` is a block of one.
 * Neither allocates. State and buffers are exact at block boundaries, which
 * is where `collectState` and swaps happen.
 */

import type {
	Engine,
	EngineCtor,
	EngineState,
	KeyedIdentity,
	ModuleSpec,
	Program,
	Registry,
} from "../types";
import { compileLaneBindings } from "./bindings";
import { deepClone } from "./deep-clone";
import type { Driver, ValueBuffers } from "./driver";
import { type FeedbackRead, captureFeedback, feedbackReads, restoreFeedback } from "./feedback";
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
	private readonly identities: readonly KeyedIdentity[];
	private readonly feedback: readonly FeedbackRead[];
	private readonly sr: number;
	private readonly bufs: ValueBuffers;
	private readonly oneL = new Float32Array(1);
	private readonly oneR = new Float32Array(1);
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
		this.bufs = {
			cur: new Float64Array(this.layout.size),
			prv: new Float64Array(this.layout.size),
		};

		const specs = program.nodes.map((n) => registry.get(n.module) as ModuleSpec);
		const laneStates = buildLaneStates(program.nodes, specs, sampleRate, program.seed, prev);
		this.identities = laneStates.identities;
		this.feedback = feedbackReads(program.nodes);
		restoreFeedback(this.feedback, laneStates.paired, this.layout, sampleRate, prev, this.bufs.cur);

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

		const tapsL = new Int32Array(program.outs.length);
		const tapsR = new Int32Array(program.outs.length);
		program.outs.forEach((nodeIndex, j) => {
			tapsL[j] = slotOf(this.layout, nodeIndex, "l", 0);
			tapsR[j] = slotOf(this.layout, nodeIndex, "r", 0);
		});

		this.driver = selectDriver({ runs: this.runs, tapsL, tapsR }, options.codegen ?? false);
	}

	get sampleCount(): number {
		return this.count;
	}

	/** Advance `n` samples; write l/r into `outL`/`outR` from `offset`. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void {
		this.driver(this.bufs, outL, outR, offset, n, this.count, this.sr);
		this.count += n;
	}

	tick(out: Float32Array): void {
		this.renderBlock(this.oneL, this.oneR, 0, 1);
		out[0] = this.oneL[0] as number;
		out[1] = this.oneR[0] as number;
	}

	/** Lane states to carry, minus each lane's scratch (derived data, never carried). */
	collectState(): EngineState {
		const nodes: Record<string, Record<string, unknown>[]> = {};
		this.runs.forEach((r, i) => {
			const key = (this.identities[i] as KeyedIdentity).key;
			nodes[key] = r.states.map(({ __scratch: _scratch, ...carried }) => deepClone(carried));
		});
		const feedback = captureFeedback(this.feedback, this.identities, this.layout, this.bufs.cur);
		return {
			nodes,
			identities: this.identities,
			feedback,
			sampleRate: this.sr,
			sampleCount: this.count,
		};
	}

	/** Read a node's output for the sample just ticked. Test/tap hook, not part of the Engine contract. */
	peek(node: number, port: string, lane: number): number {
		return this.bufs.cur[slotOf(this.layout, node, port, lane)] as number;
	}
}

export const createEngine: EngineCtor = (program, sampleRate, registry, prev) =>
	new Core3Engine(program, sampleRate, registry, prev);
