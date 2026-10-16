/**
 * `let`, `const` and `var` declarations. A `const` bound to a known value,
 * an array or a record stays a compile-time alias; everything else gets a
 * fresh local. A variable never written after its declaration (a `const`,
 * or a `let` with no write sites, written.ts) keeps the kind of its value:
 * when that value has an integer range it is an i32 local (the range fits
 * int32) or an i64 local, with that range. A variable written later stays
 * an f64 or a boolean.
 */

import type { AnyNode, VariableDeclaration, VariableDeclarator } from "acorn";
import { toF64 } from "./coerce";
import { emitExpr } from "./emit-expression";
import { emitInteger } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { INT32, SAFE, widthOf } from "./int-range";
import { intRange } from "./int-range-of";
import { placeOf } from "./place";
import { type Kind, fixed, intLocal, local } from "./values";
import { declaredWritten } from "./written";

export function emitDeclaration(e: FnEmitter, node: VariableDeclaration): void {
	const constant = node.kind === "const";
	for (const d of node.declarations) {
		const unwritten =
			constant ||
			(node.kind === "let" && d.id.type === "Identifier" && !declaredWritten(e, d.id));
		declare(e, d, constant, unwritten);
	}
}

function declare(e: FnEmitter, d: VariableDeclarator, constant: boolean, unwritten: boolean): void {
	if (d.id.type !== "Identifier") e.fail(d, "declarations must name one variable");
	const name = d.id.name;
	if (d.init === null || d.init === undefined) {
		const index = e.local("f64");
		e.code.f64Const(Number.NaN).set(index);
		e.scope.declare(name, local(index, "f64"));
		return;
	}
	if (constant && declareAlias(e, name, d.init)) return;
	const range = unwritten ? intRange(e, d.init) : null;
	const width = widthOf(range);
	if (range !== null && width !== null) {
		emitInteger(e, d.init, width);
		e.scope.declare(name, intLocal(setLocal(e, width), width, range));
		return;
	}
	let kind = emitExpr(e, d.init);
	if ((kind === "int" || kind === "long") && !unwritten) {
		toF64(e, kind);
		kind = "f64";
	}
	const index = setLocal(e, kind);
	if (kind === "int" || kind === "long")
		e.scope.declare(name, intLocal(index, kind, kind === "int" ? INT32 : SAFE));
	else e.scope.declare(name, local(index, kind));
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
