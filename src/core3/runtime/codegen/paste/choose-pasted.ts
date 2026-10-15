/**
 * Which nodes paste under a size budget. Every node starts at its call site;
 * then, in node order, a node pastes when the driver's estimated size with
 * it pasted stays within the budget. A node that does not fit is skipped and
 * later, smaller nodes may still paste. Pure: costs in, node indices out.
 */

import type { NodeCost } from "./node-cost";

export function choosePasted(costs: readonly NodeCost[], budget: number): ReadonlySet<number> {
	let size = costs.reduce((sum, c) => sum + c.call, 0);
	const pasted = new Set<number>();
	costs.forEach((cost, i) => {
		if (cost.pasted === null) return;
		const grown = size - cost.call + cost.pasted;
		if (grown > budget) return;
		size = grown;
		pasted.add(i);
	});
	return pasted;
}
