/**
 * The field names a module's code may rebind (`s.a = s.b`, `r.v = q.v`):
 * every name assigned as a named field (`x.f = …`, `x.f &&= …`) in the tick
 * or a helper. A field holding a number takes numbers; one holding an array
 * or record and named here may come to hold another one of the same shape,
 * so a backend that lays state out in memory keeps a pointer for it. Read
 * by name, not by owner: records of one shape then share one layout.
 */

import type { ModuleIR } from "../module/module-ir";
import { walk } from "../parse/walk";

export function fieldRebinds(ir: ModuleIR): ReadonlySet<string> {
	const names = new Set<string>();
	for (const fn of [ir.tick, ...ir.helpers.values()]) {
		walk(fn.node.body, (node) => {
			if (node.type !== "AssignmentExpression" || isCompound(node.operator)) return;
			const target = node.left;
			if (target.type !== "MemberExpression" || target.computed) return;
			if (target.property.type === "Identifier") names.add(target.property.name);
		});
	}
	return names;
}

/** `+=` and the like take numbers only; `=` and the logical assignments may store a reference. */
function isCompound(operator: string): boolean {
	return operator !== "=" && operator !== "&&=" && operator !== "||=" && operator !== "??=";
}
