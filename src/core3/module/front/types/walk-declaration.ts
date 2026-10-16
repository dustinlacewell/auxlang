/**
 * `let`, `const` and `var`. A `const` of a known value, an array or a
 * record names it directly. A variable never written after its declaration
 * (a `const`, or a `let` with no write sites) keeps its initial value's
 * integer range, so a backend may hold it in an integer register. Any other
 * variable holds a run-time value of its initial value's type.
 */

import type { VariableDeclaration } from "acorn";
import { rangeOf } from "./int-range";
import type { PlanContext } from "./plan-context";
import { NUM, type Ty, emittedTy, int, ref } from "./ty";
import { typeExpr } from "./type-expression";

export function walkDeclaration(c: PlanContext, node: VariableDeclaration): void {
	const constant = node.kind === "const";
	for (const d of node.declarations) {
		const ty = d.init === null || d.init === undefined ? NUM : typeExpr(c, d.init, "value");
		if (d.id.type !== "Identifier") continue;
		const unwritten = constant || (node.kind === "let" && !c.written(d.id));
		c.declare(d.id, declaredTy(ty, constant, unwritten));
	}
}

function declaredTy(init: Ty, constant: boolean, unwritten: boolean): Ty {
	if (constant && init.k === "static") return init;
	if (constant && init.k === "ref") return ref(init.shape);
	const range = unwritten ? rangeOf(init) : null;
	return range === null ? emittedTy(init) : int(range);
}
