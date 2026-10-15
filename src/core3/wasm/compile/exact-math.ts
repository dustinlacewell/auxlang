/**
 * The exact host `Math` functions (math/exact-host-math.ts) as WebAssembly:
 * each is an IEEE or int32 operation with one exact answer, so the bits
 * match V8's. `round` and `sign` are runtime functions. On int32-ranged
 * arguments, min, max, abs and the roundings run in i32 (int-math.ts).
 */

import type { AnyNode, CallExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { toF64, toInt32 } from "./coerce";
import { emitExpr } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { emitIntMath } from "./int-math";
import type { Kind } from "./values";

const UNARY: Readonly<Record<string, number>> = {
	abs: OP.f64Abs,
	floor: OP.f64Floor,
	ceil: OP.f64Ceil,
	trunc: OP.f64Trunc,
	sqrt: OP.f64Sqrt,
};

export function emitMathCall(e: FnEmitter, name: string, node: CallExpression): Kind {
	const args = node.arguments;
	if (emitIntMath(e, name, node)) return "int";
	const unary = UNARY[name];
	if (unary !== undefined) {
		f64Arg(e, args[0], node);
		e.code.op(unary);
		return "f64";
	}
	switch (name) {
		case "min":
		case "max":
			return minMax(e, name, args, node);
		case "round":
		case "sign":
			f64Arg(e, args[0], node);
			e.code.call(e.ctx.calls.runtime(name).index);
			return "f64";
		case "fround":
			f64Arg(e, args[0], node);
			e.code.op(OP.f32DemoteF64, OP.f64PromoteF32);
			return "f64";
		case "clz32":
			intArg(e, args[0], node);
			e.code.op(OP.i32Clz);
			return "int";
		case "imul":
			intArg(e, args[0], node);
			intArg(e, args[1], node);
			e.code.op(OP.i32Mul);
			return "int";
		default:
			return e.fail(node, `Math.${name} is not supported by the WASM backend`);
	}
}

/** JS evaluates every argument, then compares; NaN wins and -0 < +0, as f64.min/max. */
function minMax(e: FnEmitter, name: string, args: readonly AnyNode[], at: AnyNode): Kind {
	if (args.length === 0) {
		e.code.f64Const(name === "min" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
		return "f64";
	}
	f64Arg(e, args[0], at);
	for (let k = 1; k < args.length; k++) {
		f64Arg(e, args[k], at);
		e.code.op(name === "min" ? OP.f64Min : OP.f64Max);
	}
	return "f64";
}

function f64Arg(e: FnEmitter, arg: AnyNode | undefined, at: AnyNode): void {
	if (arg === undefined || arg.type === "SpreadElement") e.fail(at, "a plain argument is required");
	toF64(e, emitExpr(e, arg));
}

function intArg(e: FnEmitter, arg: AnyNode | undefined, at: AnyNode): void {
	if (arg === undefined || arg.type === "SpreadElement") e.fail(at, "a plain argument is required");
	toInt32(e, emitExpr(e, arg));
}
