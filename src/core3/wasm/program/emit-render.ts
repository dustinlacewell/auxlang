/**
 * The render function: `render(n)` runs n samples of the whole program, the
 * same walk as the engine's drivers (runtime/interpret-block.ts). Per sample:
 * the late slots' flip, every node in program order (a map node's lanes each
 * tick and scatter their outputs; a reducer gathers its input lanes into f64
 * views first), then the out nodes' l/r sums into the f32 output blocks.
 * Mirrored values load before the sample loop and store after it.
 */

import { type FunctionNode, parseFunction } from "../../module/tick-subset/parse-function";
import { BIND_CUR } from "../../runtime/bindings";
import { GATHER_CUR } from "../../runtime/gathers";
import type { NodeRun } from "../../runtime/node-run";
import type { ModuleSource } from "../../types";
import { seqIntrinsics } from "../bridge/seq-intrinsics";
import { FnEmitter } from "../compile/fn-emitter";
import type { Functions } from "../compile/functions";
import { type HelperSet, helperSet } from "../compile/helper-set";
import { I32, OP } from "../encode/opcodes";
import { emitTick } from "./emit-tick";
import { laneRoles } from "./lane-roles";
import type { WasmLayout } from "./memory-layout";
import { RenderLocals } from "./render-locals";
import { ValueSlots } from "./value-slots";

export interface RenderInput {
	readonly runs: readonly NodeRun[];
	readonly modules: readonly string[];
	readonly sources: readonly ModuleSource[];
	readonly memory: WasmLayout;
	readonly tapsL: Int32Array;
	readonly tapsR: Int32Array;
	readonly sampleRate: number;
	/** The host's table fill import. */
	readonly fill: number;
}

export interface RenderBody {
	readonly locals: readonly number[];
	readonly body: readonly number[];
}

export function emitRender(input: RenderInput, fns: Functions): RenderBody {
	assertUpstream(input.runs);
	const e = new FnEmitter([I32], {
		owner: "render",
		roles: null,
		cache: null,
		calls: fns.calls(helperSet("render", {})),
		intrinsics: null,
		ret: { k: "exit", depth: 0 },
	});
	const n = 0;
	const k = e.local("int");
	const locals = new RenderLocals(e);
	const slots = new ValueSlots(e, locals, input.memory.cur, input.runs);
	const walk = new NodeWalk(e, input, fns, locals, slots);
	e.depth = 2;
	const sample = e.capture(() => {
		slots.emitFlip();
		input.runs.forEach((_, i) => walk.node(i));
		emitTaps(e, input, slots, k);
	});
	e.depth = 0;
	for (const m of locals.mirrors) e.code.i32Const(0).loadF64(m.addr).set(m.local);
	e.code.i32Const(0).set(k);
	e.code.open(OP.block, null).open(OP.loop, null);
	e.code.get(k).get(n).op(OP.i32GeS).op(OP.brIf).u32(1);
	e.code.append(sample.bytes);
	e.code.get(k).i32Const(1).op(OP.i32Add).set(k).op(OP.br).u32(0);
	e.code.op(OP.end, OP.end);
	for (const m of locals.mirrors) e.code.i32Const(0).get(m.local).storeF64(m.addr);
	return { locals: e.locals, body: e.code.bytes };
}

class NodeWalk {
	private readonly ticks = new Map<string, FunctionNode>();
	private readonly sets = new Map<string, HelperSet>();

	constructor(
		private readonly e: FnEmitter,
		private readonly input: RenderInput,
		private readonly fns: Functions,
		private readonly locals: RenderLocals,
		private readonly slots: ValueSlots,
	) {}

	node(i: number): void {
		const run = this.input.runs[i] as NodeRun;
		if (run.gathers !== null) {
			this.gather(i);
			this.lane(i, 0);
			this.scatter(i, 0);
			return;
		}
		for (let lane = 0; lane < run.laneCount; lane++) {
			this.lane(i, lane);
			this.scatter(i, lane);
		}
	}

	private lane(i: number, lane: number): void {
		const { e, input, locals } = this;
		const run = input.runs[i] as NodeRun;
		const module = input.modules[i] as string;
		const memory = input.memory.nodes[i];
		const laneMemory = memory?.lanes[lane];
		if (memory === undefined || laneMemory === undefined)
			throw new Error(`wasm: no memory for node ${i}`);
		emitTick(e, {
			fn: this.tick(i),
			owner: `${module} tick (node ${i} lane ${lane})`,
			calls: this.fns.calls(this.set(i)),
			roles: laneRoles(e, run, memory, lane, this.slots, (addr) => locals.at(addr)),
			cache: {
				k: "locals",
				slot: (s) => locals.at(laneMemory.cache + 8 * s),
				address: laneMemory.cache,
			},
			intrinsics:
				laneMemory.table === null ? null : seqIntrinsics(laneMemory.table, i, lane, input.fill),
			sampleRate: input.sampleRate,
			width: run.gathers?.width ?? 1,
		});
	}

	/** The engine's scatter: each output into its value slot for this lane. */
	private scatter(i: number, lane: number): void {
		const run = this.input.runs[i] as NodeRun;
		const outs = this.input.memory.nodes[i]?.outs ?? {};
		run.outPorts.forEach((port, j) => {
			const from = this.locals.at(outs[port] as number);
			this.e.code.get(from).set(this.slots.current((run.outBases[j] as number) + lane));
		});
	}

	/** A reducer's lane inputs into their f64 views, as the engine's gathers. */
	private gather(i: number): void {
		const run = this.input.runs[i] as NodeRun;
		const views = this.input.memory.nodes[i]?.views ?? {};
		for (const port of run.gathers?.ports ?? []) {
			const view = views[port.name];
			if (view === undefined) continue;
			for (let l = 0; l < port.srcLanes; l++) {
				const slot = port.base + l;
				const from =
					port.kind === GATHER_CUR ? this.slots.current(slot) : this.slots.previous(slot);
				this.e.code
					.i32Const(0)
					.get(from)
					.storeF64(view + 8 * l);
			}
		}
	}

	private tick(i: number): FunctionNode {
		const text = (this.input.sources[i] as ModuleSource).tick;
		let fn = this.ticks.get(text);
		if (fn === undefined) {
			fn = parseFunction(text, `${this.input.modules[i]} tick`).node;
			this.ticks.set(text, fn);
		}
		return fn;
	}

	private set(i: number): HelperSet {
		const module = this.input.modules[i] as string;
		let set = this.sets.get(module);
		if (set === undefined) {
			set = helperSet(module, (this.input.sources[i] as ModuleSource).helpers);
			this.sets.set(module, set);
		}
		return set;
	}
}

/** Per sample: the sums of the out nodes' l and r, stored as f32 like the engine's output arrays. */
function emitTaps(e: FnEmitter, input: RenderInput, slots: ValueSlots, k: number): void {
	const channels: [Int32Array, number][] = [
		[input.tapsL, input.memory.outL],
		[input.tapsR, input.memory.outR],
	];
	for (const [taps, out] of channels) {
		e.code.get(k).i32Const(2).op(OP.i32Shl);
		e.code.f64Const(0);
		for (const slot of taps) e.code.get(slots.current(slot)).op(OP.f64Add);
		e.code.op(OP.f32DemoteF64).storeF32(out);
	}
}

/**
 * A same-sample read must come from a node earlier in program order (the
 * engine's toposort); the locals then hold this sample's value, as `cur`.
 */
function assertUpstream(runs: readonly NodeRun[]): void {
	const owner: number[] = [];
	runs.forEach((run, i) => {
		for (const base of run.outBases)
			for (let l = 0; l < Math.max(1, run.laneCount); l++) owner[base + l] = i;
	});
	runs.forEach((run, i) => {
		const reads: number[] = [];
		for (const b of run.bindings ?? [])
			b.kinds.forEach((kind, j) => kind === BIND_CUR && reads.push(b.offsets[j] as number));
		for (const p of run.gathers?.ports ?? []) if (p.kind === GATHER_CUR) reads.push(p.base);
		for (const slot of reads)
			if ((owner[slot] ?? i) >= i)
				throw new Error(`wasm: node ${i} reads slot ${slot} before it is written`);
	});
}
