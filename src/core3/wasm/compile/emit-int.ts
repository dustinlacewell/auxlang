/**
 * An expression with an integer range (int-range-of.ts) as an i32 or an
 * i64. A constant is a `const`; a value emitted in another kind is an
 * integer in the wanted width's range, so each conversion is exact and the
 * truncations never trap.
 */

import type { AnyNode } from "acorn";
import { OP } from "../encode/opcodes";
import { emitExpr } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { fitsI32, widthOf } from "./int-range";
import { intRange } from "./int-range-of";
import { staticOf } from "./static-value";
import type { Width } from "./values";

/** `node` can be emitted as an i32: its range fits int32. */
export function isInt(e: FnEmitter, node: AnyNode): boolean {
	return fitsI32(intRange(e, node));
}

/** The integer kind `node` can be emitted as; null when it has no integer range. */
export function integerWidth(e: FnEmitter, node: AnyNode): Width | null {
	return widthOf(intRange(e, node));
}

export function emitInt(e: FnEmitter, node: AnyNode): void {
	emitInteger(e, node, "int");
}

/** `node` as `width`; its range must fit (int: int32; long: any range). */
export function emitInteger(e: FnEmitter, node: AnyNode, width: Width): void {
	const folded = staticOf(e, node);
	if (typeof folded?.v === "number") {
		if (width === "int") e.code.i32Const(folded.v);
		else e.code.i64Const(folded.v);
		return;
	}
	const kind = emitExpr(e, node);
	if (kind === width) return;
	if (kind === "bool") e.fail(node, "a boolean was typed as an integer (compiler bug)");
	if (kind === "f64") e.code.op(width === "int" ? OP.i32TruncF64S : OP.i64TruncF64S);
	else e.code.op(width === "int" ? OP.i32WrapI64 : OP.i64ExtendI32S);
}
