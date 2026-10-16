/**
 * `let`, `const` and `var`. A variable never written after its declaration
 * (a `const`, or a `let` with no write sites) of a known value, an array or
 * a record names it directly, and one of a tick's parameter records is that
 * record (the rules never let it be written, module/roles.ts); of a number, it keeps its initial value's
 * integer range, so a backend may hold it in an integer register. A written
 * variable holds a run-time value of its initial value's type, or the
 * address of an array or record of its initial one's shape; its
 * initialisation is a store, unified (unify.ts) like every later one.
 */

import type { VariableDeclaration } from "acorn";
import { rangeOf } from "./int-range";
import type { PlanContext } from "./plan-context";
import { NUM, type Ty, emittedTy, int, ref } from "./ty";
import { typeExpr } from "./type-expression";

export function walkDeclaration(c: PlanContext, node: VariableDeclaration): void {
	for (const d of node.declarations) {
		const ty = d.init === null || d.init === undefined ? NUM : typeExpr(c, d.init, "value");
		if (d.id.type !== "Identifier") continue;
		const unwritten = node.kind === "const" || (node.kind === "let" && !c.written(d.id));
		const declared = declaredTy(ty, unwritten);
		c.declare(d.id, declared);
		if (!unwritten && d.init !== null && d.init !== undefined)
			c.events.push({ k: "store", node: d, place: declared, value: ty });
	}
}

function declaredTy(init: Ty, unwritten: boolean): Ty {
	if (init.k === "ref") return ref(init.shape);
	if (init.k === "role") return init;
	if (unwritten && init.k === "static") return init;
	const range = unwritten ? rangeOf(init) : null;
	return range === null ? emittedTy(init) : int(range);
}
