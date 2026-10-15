/**
 * An index into an array in memory, evaluated once, and the JS rule for it:
 * an index is valid when it is an integer in [0, length) (-0 is 0). Code that
 * needs the element runs with its address pushed only when the index is
 * valid; JS reads `undefined` and drops the write otherwise. An index whose
 * range (int-range-of.ts) is inside [0, length) needs no check; an int32 one
 * needs one unsigned compare; an f64 known to be an integer, two compares.
 */

import type { AnyNode } from "acorn";
import { OP } from "../encode/opcodes";
import { emitExpr } from "./emit-expression";
import { emitInt, isInt } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { intRange, provenIndex } from "./int-range-of";
import { staticOf } from "./static-value";
import type { Address, Kind } from "./values";

/**
 * A constant index, or the local holding a run-time one: an i32 (`proven`:
 * always valid), or an f64 (`integral`: always an integer).
 */
export type Index =
	| { readonly k: "static"; readonly value: number }
	| { readonly k: "int"; readonly local: number; readonly proven: boolean }
	| { readonly k: "f64"; readonly local: number; readonly integral: boolean };

export function emitIndex(e: FnEmitter, property: AnyNode, length: number): Index {
	const known = staticOf(e, property);
	if (known !== null) {
		if (typeof known.v !== "number") return e.fail(property, "an index must be a number");
		return { k: "static", value: known.v };
	}
	if (isInt(e, property)) {
		emitInt(e, property);
		return { k: "int", local: setLocal(e, "int"), proven: provenIndex(e, property, length) };
	}
	const integral = intRange(e, property) !== null;
	const kind = emitExpr(e, property);
	if (kind === "bool") return e.fail(property, "a boolean is not an index");
	if (kind === "int") return { k: "int", local: setLocal(e, "int"), proven: false };
	return { k: "f64", local: setLocal(e, "f64"), integral };
}

function setLocal(e: FnEmitter, kind: Kind): number {
	const local = e.local(kind);
	e.code.set(local);
	return local;
}

export function validIndex(index: number, length: number): boolean {
	return Number.isInteger(index) && index >= 0 && index < length;
}

/** Where an array's elements are: its address, element count and element size. */
export interface Span {
	readonly at: Address;
	readonly length: number;
	readonly size: number;
}

/**
 * `valid(offset)` with the element's address pushed (to be used at memarg
 * `offset`) when the index is valid, else `invalid()`. Both leave a value of
 * kind `result`, or nothing when it is null.
 */
export function guarded(
	e: FnEmitter,
	span: Span,
	index: Index,
	result: Kind | null,
	valid: (offset: number) => void,
	invalid: () => void,
): void {
	if (index.k === "static") {
		if (!validIndex(index.value, span.length)) invalid();
		else {
			pushBase(e, span.at);
			valid(span.at.offset + index.value * span.size);
		}
		return;
	}
	if (index.k === "int" && index.proven) {
		pushElementAddress(e, span, index);
		valid(span.at.offset);
		return;
	}
	pushValid(e, index, span.length);
	e.enter(OP.if, result);
	pushElementAddress(e, span, index);
	valid(span.at.offset);
	e.else();
	invalid();
	e.exit();
}

/**
 * The address of element `index` in an i32 local, trapping (`unreachable`)
 * when the index is not valid: JS throws reading a field of `undefined`.
 */
export function addressOrTrap(e: FnEmitter, span: Span, index: Index, at: AnyNode): Address {
	if (index.k === "static") {
		if (!validIndex(index.value, span.length))
			return e.fail(at, `index ${index.value} is outside the ${span.length} records`);
		return { base: span.at.base, offset: span.at.offset + index.value * span.size };
	}
	if (index.k !== "int" || !index.proven) {
		pushValid(e, index, span.length);
		e.code.op(OP.i32Eqz);
		e.enter(OP.if);
		e.code.op(OP.unreachable);
		e.exit();
	}
	pushElementAddress(e, span, index);
	const base = e.local("int");
	e.code.set(base);
	return { base, offset: span.at.offset };
}

function pushBase(e: FnEmitter, at: Address): void {
	if (at.base === null) e.code.i32Const(0);
	else e.code.get(at.base);
}

/** An i32: 1 when the run-time index is an integer in [0, length). */
function pushValid(e: FnEmitter, index: Index & { k: "f64" | "int" }, length: number): void {
	const t = index.local;
	if (index.k === "int") {
		e.code.get(t).i32Const(length).op(OP.i32LtU);
		return;
	}
	e.code.get(t).f64Const(0).op(OP.f64Ge);
	e.code.get(t).f64Const(length).op(OP.f64Lt).op(OP.i32And);
	if (!index.integral) e.code.get(t).op(OP.f64Trunc).get(t).op(OP.f64Eq).op(OP.i32And);
}

/** base + index × size, for a valid run-time index; the span's offset goes in the memarg. */
function pushElementAddress(e: FnEmitter, span: Span, index: Index & { k: "f64" | "int" }): void {
	e.code.get(index.local);
	if (index.k === "f64") e.code.op(OP.i32TruncF64U);
	if (span.size > 1) {
		const shift = Math.log2(span.size);
		if (Number.isInteger(shift)) e.code.i32Const(shift).op(OP.i32Shl);
		else e.code.i32Const(span.size).op(OP.i32Mul);
	}
	if (span.at.base !== null) e.code.get(span.at.base).op(OP.i32Add);
}
