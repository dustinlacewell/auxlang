/**
 * JS conversions on the value at the top of the stack: ToNumber (a boolean
 * is 0 or 1), truthiness (0, -0 and NaN are false), and ToInt32 (bitwise
 * operands, wrapping modulo 2^32 like JS). A `long` is an integer within
 * ±2^53: its f64 is exact and its ToInt32 is its low 32 bits.
 */

import type { AnyNode } from "acorn";
import { OP } from "../encode/opcodes";
import type { FnEmitter } from "./fn-emitter";
import type { Kind } from "./values";

export function toF64(e: FnEmitter, kind: Kind): void {
	if (kind === "bool") e.code.op(OP.f64ConvertI32U);
	else if (kind === "int") e.code.op(OP.f64ConvertI32S);
	else if (kind === "long") e.code.op(OP.f64ConvertI64S);
}

export function toBool(e: FnEmitter, kind: Kind): void {
	if (kind === "int") e.code.i32Const(0).op(OP.i32Ne);
	if (kind === "long") e.code.op(OP.i64Eqz, OP.i32Eqz);
	if (kind !== "f64") return;
	const t = e.local("f64");
	// x !== 0 && x === x
	e.code.tee(t).f64Const(0).op(OP.f64Ne).get(t).get(t).op(OP.f64Eq).op(OP.i32And);
}

/**
 * Below 2^31 in magnitude ToInt32 is one truncation, inline; the runtime
 * function wraps the rest (and NaN and the infinities).
 */
export function toInt32(e: FnEmitter, kind: Kind): void {
	if (kind === "long") e.code.op(OP.i32WrapI64);
	if (kind !== "f64") return;
	const x = e.local("f64");
	e.code
		.tee(x)
		.op(OP.f64Abs)
		.f64Const(2 ** 31)
		.op(OP.f64Lt);
	e.enter(OP.if, "int");
	e.code.get(x).op(OP.i32TruncF64S);
	e.else();
	e.code.get(x).call(e.ctx.calls.runtime("toInt32").index);
	e.exit();
}

/** Convert for a store into a slot of kind `to`. A number never silently becomes a boolean. */
export function coerce(e: FnEmitter, from: Kind, to: Kind, at: AnyNode): void {
	if (from === to) return;
	if (to === "f64") toF64(e, from);
	else if (to === "int") toInt32(e, from);
	else if (to === "long") e.fail(at, "only an integer is stored as an i64");
	else if (from === "bool") return;
	else e.fail(at, "a boolean variable cannot take a number here");
}
