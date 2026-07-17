/**
 * Reachability walk from the roots. Only nodes an `out()` can see survive —
 * a discarded chain never appears in the program (the honesty fix: value
 * semantics with no zombie registrations). Cycles are legal here; the
 * visited set terminates them. z-edges are traversed too: the fed-back
 * producer is reachable.
 */

import { isNodeRef, isZRef } from "../graph/input-kinds";
import type { GNode } from "../graph/node";

export function collect(roots: readonly GNode[]): GNode[] {
	const seen = new Set<GNode>();
	const order: GNode[] = [];
	const visit = (node: GNode): void => {
		if (seen.has(node)) return;
		seen.add(node);
		for (const value of Object.values(node.inputs)) {
			if (isNodeRef(value)) visit(value.node);
			else if (isZRef(value)) visit(value.z.node);
		}
		order.push(node);
	};
	for (const root of roots) visit(root);
	return order;
}
