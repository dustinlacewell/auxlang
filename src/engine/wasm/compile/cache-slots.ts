/**
 * One past the highest math cache slot (`__mc[slot]`, module/bind-math/
 * cache-names.ts) in `nodes`: the cache size they need.
 */

import type { AnyNode } from "acorn";
import { walk } from "../../module/front/parse/walk";

export function cacheSlotsIn(nodes: readonly AnyNode[]): number {
	let slots = 0;
	for (const root of nodes)
		walk(root, (node) => {
			const slot = cacheSlotOf(node);
			if (slot !== null) slots = Math.max(slots, slot + 1);
		});
	return slots;
}

function cacheSlotOf(node: AnyNode): number | null {
	if (node.type !== "MemberExpression" || !node.computed) return null;
	if (node.object.type !== "Identifier" || node.object.name !== "__mc") return null;
	const p = node.property;
	return p.type === "Literal" && typeof p.value === "number" ? p.value : null;
}
