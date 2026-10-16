/**
 * `let`, `const` and `var` declarations, stored as the plan types them
 * (front/types/walk-declaration.ts). A known value stays a compile-time
 * constant. A tick's parameter record is an alias of it. An array or
 * record is an alias when the variable is never reassigned, else an
 * address in an i32 local (address-variable.ts). A
 * variable the plan gives an integer range (an unwritten one, or a loop
 * counter, loop-counter.ts) is an i32 local when the range fits int32, else
 * an i64 local. Any other variable is an f64 or a boolean.
 */

import type { AnyNode, Identifier, VariableDeclaration, VariableDeclarator } from "acorn";
import { declareAddress } from "./address-variable";
import { toF64 } from "./coerce";
import { emitExpr } from "./emit-expression";
import { emitInteger } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { widthOf } from "./int-width";
import { placeOf } from "./place";
import { resolve } from "./resolve";
import { type Kind, fixed, local } from "./values";
import { variableWritten } from "./written";

export function emitDeclaration(e: FnEmitter, node: VariableDeclaration): void {
	for (const d of node.declarations) declare(e, d);
}

function declare(e: FnEmitter, d: VariableDeclarator): void {
	if (d.id.type !== "Identifier") e.fail(d, "declarations must name one variable");
	const id = d.id;
	if (d.init === null || d.init === undefined) {
		const index = e.local("f64");
		e.code.f64Const(Number.NaN).set(index);
		e.bind(id, local(index, "f64"));
		return;
	}
	const declared = e.typeOf(id);
	if (declared.k === "static") {
		e.bind(id, fixed(declared.v));
		return;
	}
	if (declared.k === "role") {
		declareRoleAlias(e, id, d.init);
		return;
	}
	if (declared.k === "ref") {
		const fn = e.ctx.fn;
		if (fn !== null && variableWritten(fn, id)) declareAddress(e, id, d.init);
		else declareAlias(e, id, d.init);
		return;
	}
	const width = widthOf(e.range(id));
	if (width !== null) {
		emitInteger(e, d.init, width);
		e.bind(id, local(setLocal(e, width), width));
		return;
	}
	let kind = emitExpr(e, d.init);
	if (kind === "int" || kind === "long") {
		toF64(e, kind);
		kind = "f64";
	}
	e.bind(id, local(setLocal(e, kind), kind));
}

function setLocal(e: FnEmitter, kind: Kind): number {
	const index = e.local(kind);
	e.code.set(index);
	return index;
}

/** `const t = s`: `t` names the tick's parameter record itself; no local. */
function declareRoleAlias(e: FnEmitter, id: Identifier, init: AnyNode): void {
	const value = resolve(e, init);
	if (value?.k !== "role")
		e.fail(init, "the plan gives a parameter record here, but it names none (compiler bug)");
	e.bind(id, value);
}

/**
 * An array or record variable never reassigned names it directly; no local.
 * A record at a run-time index keeps the code that finds its address.
 */
function declareAlias(e: FnEmitter, id: Identifier, init: AnyNode): void {
	const value = placeOf(e, init);
	if (value?.k !== "memory" || value.shape.k === "number")
		e.fail(init, "the plan gives an array or record here, but it names none (compiler bug)");
	e.bind(id, value);
}
