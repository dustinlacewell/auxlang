/**
 * The render function: `render(n)` runs n samples of the whole program, the
 * same walk as the engine's drivers (runtime/interpret-block.ts). Per sample:
 * the late slots' flip, the lambda time, every node in program order
 * (node-walk.ts), then the out nodes' l/r sums into the f32 output blocks.
 * Mirrored values (the sample count among them) load before the sample loop
 * and store after it.
 */

import { BIND_CUR } from "../../runtime/bindings";
import { GATHER_CUR } from "../../runtime/gathers";
import type { ModuleIR } from "../../module/front/module/module-ir";
import type { NodeRun } from "../../runtime/node-run";
import type { NodePlans } from "../../runtime/specialise/specialise-nodes";
import { FnEmitter } from "../compile/fn-emitter";
import type { FunctionTable } from "../compile/function-table";
import type { Functions } from "../compile/functions";
import { helperSet } from "../compile/helper-set";
import { I32, OP } from "../encode/opcodes";
import type { LambdaSources } from "./lambda-sources";
import type { WasmLayout } from "./memory-layout";
import { NodeWalk } from "./node-walk";
import { RenderLocals } from "./render-locals";
import { ValueSlots } from "./value-slots";

export interface RenderInput {
	readonly runs: readonly NodeRun[];
	readonly modules: readonly string[];
	/** Each node's module, as the front end read it. */
	readonly irs: readonly ModuleIR[];
	/** Each node lane's tick plan. */
	readonly plans: NodePlans;
	readonly lambdas: LambdaSources;
	readonly memory: WasmLayout;
	readonly tapsL: Int32Array;
	readonly tapsR: Int32Array;
	readonly sampleRate: number;
	/** The module's table `enter` function (table-enter.ts). */
	readonly enter: number;
}

export interface RenderBody {
	readonly locals: readonly number[];
	readonly body: readonly number[];
}

export function emitRender(input: RenderInput, fns: Functions, table: FunctionTable): RenderBody {
	assertUpstream(input.runs);
	const e = new FnEmitter([I32], {
		owner: "render",
		fn: null,
		plan: null,
		roles: null,
		cache: null,
		calls: fns.calls(helperSet("render", new Map())),
		intrinsics: null,
		ret: { k: "exit", depth: 0 },
	});
	const n = 0;
	const k = e.local("int");
	const time = e.local("f64");
	const locals = new RenderLocals(e);
	const count = locals.at(input.memory.count);
	const slots = new ValueSlots(e, locals, input.memory.cur, input.runs, input.memory.slots);
	const walk = new NodeWalk({ e, input, fns, table, locals, slots, time });
	e.depth = 2;
	const sample = e.capture(() => {
		slots.emitFlip();
		if (hasLambdas(input.memory)) emitTime(e, count, k, input.sampleRate, time);
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
	e.code.get(count).get(n).op(OP.f64ConvertI32S).op(OP.f64Add).set(count);
	for (const m of locals.mirrors) e.code.i32Const(0).get(m.local).storeF64(m.addr);
	return { locals: e.locals, body: e.code.bytes };
}

function hasLambdas(memory: WasmLayout): boolean {
	return memory.nodes.some((node) =>
		node.lanes.some((lane) => Object.keys(lane.lambdas).length > 0),
	);
}

/** This sample's lambda time, as the JS driver's `(count + k) / sr`. */
function emitTime(e: FnEmitter, count: number, k: number, sampleRate: number, time: number): void {
	e.code.get(count).get(k).op(OP.f64ConvertI32S).op(OP.f64Add);
	e.code.f64Const(sampleRate).op(OP.f64Div).set(time);
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
