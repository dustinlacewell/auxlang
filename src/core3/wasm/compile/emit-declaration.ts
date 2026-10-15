/**
 * `let`, `const` and `var` declarations. A `const` bound to a known value,
 * an array or a record stays a compile-time alias; everything else gets a
 * fresh local. A variable never written after its declaration (a `const`,
 * or a `let` that the code after it in its block never writes) keeps the
 * kind of its value: when that value's range fits int32 it is an i32 local
 * with that range. A variable written later stays an f64 or a boolean.
 */

import type { AnyNode, VariableDeclaration, VariableDeclarator } from "acorn";
import { writes } from "./assigned-names";
import { toF64 } from "./coerce";
import { emitExpr } from "./emit-expression";
import { emitInt, isInt } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { INT32, toI32 } from "./int-range";
import { intRange } from "./int-range-of";
import { placeOf } from "./place";
import { staticOf } from "./static-value";
import { fixed, intLocal, local } from "./values";

/** `later`: the code in the declaration's scope after it; null when not known (every `let` may be written). */
export function emitDeclaration(
	e: FnEmitter,
	node: VariableDeclaration,
	later: readonly AnyNode[] | null,
): void {
	const constant = node.kind === "const";
	for (const d of node.declarations) {
		const name = d.id.type === "Identifier" ? d.id.name : "";
		const unwritten =
			constant || (node.kind === "let" && later !== null && !writes([node, ...later], name));
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
	if (unwritten && isInt(e, d.init)) {
		const range = toI32(intRange(e, d.init));
		emitInt(e, d.init);
		const index = e.local("int");
		e.code.set(index);
		e.scope.declare(name, intLocal(index, range));
		return;
	}
	let kind = emitExpr(e, d.init);
	if (kind === "int" && !unwritten) {
		toF64(e, kind);
		kind = "f64";
	}
	const index = e.local(kind);
	e.code.set(index);
	e.scope.declare(name, kind === "int" ? intLocal(index, INT32) : local(index, kind));
}

/**
 * A `const` of a known value, an array or a record names it directly; no
 * local. A record at a run-time index keeps the code that finds its address.
 */
function declareAlias(e: FnEmitter, name: string, init: AnyNode): boolean {
	const folded = staticOf(e, init);
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
