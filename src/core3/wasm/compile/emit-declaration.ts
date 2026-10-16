/**
 * `let`, `const` and `var` declarations. A `const` bound to a known value,
 * an array or a record stays a compile-time alias; everything else gets a
 * fresh local. A variable the plan gives an integer range (an unwritten
 * one, front/types/walk-declaration.ts, or a loop counter, loop-counter.ts)
 * is an i32 local when the range fits int32, else an i64 local. Any other
 * variable is an f64 or a boolean.
 */

import type { AnyNode, VariableDeclaration, VariableDeclarator } from "acorn";
import { toF64 } from "./coerce";
import { emitExpr } from "./emit-expression";
import { emitInteger } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { widthOf } from "./int-width";
import { placeOf } from "./place";
import { type Kind, fixed, local } from "./values";

export function emitDeclaration(e: FnEmitter, node: VariableDeclaration): void {
	for (const d of node.declarations) declare(e, d, node.kind === "const");
}

function declare(e: FnEmitter, d: VariableDeclarator, constant: boolean): void {
	if (d.id.type !== "Identifier") e.fail(d, "declarations must name one variable");
	const name = d.id.name;
	if (d.init === null || d.init === undefined) {
		const index = e.local("f64");
		e.code.f64Const(Number.NaN).set(index);
		e.scope.declare(name, local(index, "f64"));
		return;
	}
	if (constant && declareAlias(e, name, d.init)) return;
	const width = widthOf(e.range(d.id));
	if (width !== null) {
		emitInteger(e, d.init, width);
		e.scope.declare(name, local(setLocal(e, width), width));
		return;
	}
	let kind = emitExpr(e, d.init);
	if (kind === "int" || kind === "long") {
		toF64(e, kind);
		kind = "f64";
	}
	e.scope.declare(name, local(setLocal(e, kind), kind));
}

function setLocal(e: FnEmitter, kind: Kind): number {
	const index = e.local(kind);
	e.code.set(index);
	return index;
}

/**
 * A `const` of a known value, an array or a record names it directly; no
 * local. A record at a run-time index keeps the code that finds its address.
 */
function declareAlias(e: FnEmitter, name: string, init: AnyNode): boolean {
	const folded = e.fold(init);
	if (folded !== null) {
		e.scope.declare(name, fixed(folded.v));
		return true;
	}
	const placed = e.capture(() => placeOf(e, init));
	const value = placed.value;
	if (value?.k !== "memory" || value.shape.k === "number") return false;
	e.code.append(placed.bytes);
	e.scope.declare(name, value);
	return true;
}
