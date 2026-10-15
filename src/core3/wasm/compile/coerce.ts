/**
 * JS conversions on the value at the top of the stack: ToNumber (a boolean
 * is 0 or 1), truthiness (0, -0 and NaN are false), and ToInt32 (bitwise
 * operands, wrapping modulo 2^32 like JS).
 */

import type { AnyNode } from "acorn";
import { OP } from "../encode/opcodes";
import type { FnEmitter } from "./fn-emitter";
import type { Kind } from "./values";

export function toF64(e: FnEmitter, kind: Kind): void {
	if (kind === "bool") e.code.op(OP.f64ConvertI32U);
	else if (kind === "int") e.code.op(OP.f64ConvertI32S);
}

export function toBool(e: FnEmitter, kind: Kind): void {
	if (kind === "int") e.code.i32Const(0).op(OP.i32Ne);
	if (kind !== "f64") return;
	const t = e.local("f64");
	// x !== 0 && x === x
	e.code.tee(t).f64Const(0).op(OP.f64Ne).get(t).get(t).op(OP.f64Eq).op(OP.i32And);
}

export function toInt32(e: FnEmitter, kind: Kind): void {
	if (kind === "f64") e.code.call(e.ctx.calls.runtime("toInt32").index);
}

/** Convert for a store into a slot of kind `to`. A number never silently becomes a boolean. */
export function coerce(e: FnEmitter, from: Kind, to: Kind, at: AnyNode): void {
	if (to === "f64") toF64(e, from);
	else if (to === "int") toInt32(e, from);
	else if (from === "bool") return;
	else e.fail(at, "a boolean variable cannot take a number here");
}
