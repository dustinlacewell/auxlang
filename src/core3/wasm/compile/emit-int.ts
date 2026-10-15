/**
 * An expression whose range fits int32 (int-range-of.ts), as an i32. A
 * constant is an `i32.const`; an expression that was emitted as an f64
 * holds an integer in int32, so the truncation is exact and never traps.
 */

import type { AnyNode } from "acorn";
import { OP } from "../encode/opcodes";
import { emitExpr } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { fitsI32 } from "./int-range";
import { intRange } from "./int-range-of";
import { staticOf } from "./static-value";

/** `node` can be emitted as an i32: its range fits int32. */
export function isInt(e: FnEmitter, node: AnyNode): boolean {
	return fitsI32(intRange(e, node));
}

export function emitInt(e: FnEmitter, node: AnyNode): void {
	const folded = staticOf(e, node);
	if (typeof folded?.v === "number") {
		e.code.i32Const(folded.v);
		return;
	}
	const kind = emitExpr(e, node);
	if (kind === "f64") e.code.op(OP.i32TruncF64S);
	else if (kind === "bool") e.fail(node, "a boolean was typed as an integer (compiler bug)");
}
