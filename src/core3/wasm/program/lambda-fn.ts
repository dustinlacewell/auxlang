/**
 * One signal lambda occurrence `(s, sr, t) => n` as its own WASM function,
 * compiled as a helper is (compile/compile-helper.ts): `s` is a lambda's
 * empty state (the checker allows no field of it), `sr` the sample rate,
 * known while compiling, `t` the time in seconds, passed per sample. A
 * lambda that calls auxlang's math takes its own cache's address as a
 * hidden first parameter, as a cached helper does.
 */

import type { FunctionIR } from "../../module/front/module/module-ir";
import { compileHelper } from "../compile/compile-helper";
import type { ArgShape } from "../compile/emit-context";
import type { FunctionTable } from "../compile/function-table";
import type { Functions } from "../compile/functions";
import { helperSet } from "../compile/helper-set";
import { F64 } from "../encode/opcodes";

export interface LambdaFn {
	readonly index: number;
	/** Takes its cache's address as a hidden first parameter. */
	readonly cached: boolean;
	/** Names `t`, so takes the time as its (next) parameter. */
	readonly timed: boolean;
}

export function compileLambda(
	ir: FunctionIR,
	owner: string,
	sampleRate: number,
	fns: Functions,
	table: FunctionTable,
): LambdaFn {
	const set = helperSet(owner, new Map([["lambda", ir]]));
	const shapes = lambdaShapes(sampleRate).slice(0, ir.node.params.length);
	const fn = compileHelper(set, "lambda", shapes, fns.calls(set));
	// The checker (module/front/kinds/) already refuses a lambda that returns a boolean.
	if (fn.result !== "f64")
		throw new Error(`wasm: ${owner}: internal: a boolean lambda passed the checker`);
	const type = table.typeIndex(fn.params, [F64]);
	return {
		index: table.add({ type, locals: fn.locals, body: fn.body }),
		cached: set.cached,
		timed: shapes.length === 3,
	};
}

/** (state, sampleRate, time). */
function lambdaShapes(sampleRate: number): ArgShape[] {
	return [
		{ k: "static", value: undefined },
		{ k: "static", value: sampleRate },
		{ k: "run", kind: "f64" },
	];
}
