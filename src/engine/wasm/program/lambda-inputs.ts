/**
 * A node lane's lambda inputs for one sample, before its tick: each lambda
 * (lambda-fn.ts) called at this sample's time with its own cache, its value
 * in an f64 local that the tick's input reads (lane-roles.ts). JS also calls
 * every lambda input once per lane and sample, before the tick
 * (runtime/interpret-sample.ts).
 */

import type { FnEmitter } from "../compile/fn-emitter";
import type { FunctionTable } from "../compile/function-table";
import type { Functions } from "../compile/functions";
import { compileLambda } from "./lambda-fn";
import type { LambdaSource } from "./lambda-sources";
import type { LambdaMemory } from "./memory-layout";

export interface LambdaSite {
	/** Input port → its bound lambda. */
	readonly sources: Readonly<Record<string, LambdaSource>>;
	readonly memory: Readonly<Record<string, LambdaMemory>>;
	/** Names the lane in errors. */
	readonly owner: string;
	/** The f64 local holding this sample's time. */
	readonly time: number;
	readonly sampleRate: number;
}

/** Emits the calls; returns input port → the local holding its value. */
export function emitLambdaInputs(
	e: FnEmitter,
	site: LambdaSite,
	fns: Functions,
	table: FunctionTable,
): Record<string, number> {
	const locals: Record<string, number> = {};
	for (const [port, src] of Object.entries(site.sources)) {
		const memory = site.memory[port];
		if (memory === undefined)
			throw new Error(`wasm: ${site.owner}: no memory for lambda '${port}'`);
		const owner = `lambda (${site.owner} input '${port}')`;
		const fn = compileLambda(src.ir, owner, site.sampleRate, fns, table);
		if (fn.cached) e.code.i32Const(memory.cache);
		if (fn.timed) e.code.get(site.time);
		e.code.call(fn.index);
		const value = e.local("f64");
		e.code.set(value);
		locals[port] = value;
	}
	return locals;
}
