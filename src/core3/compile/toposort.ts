/**
 * Topological sort with z-edges cut. Only plain node refs (`k: "n"` edges)
 * are dependencies; a z-edge reads the previous sample, so it never orders
 * anything. A cycle that does NOT pass through a z-edge is a loud error
 * naming the nodes on the cycle — feedback must go through loop().
 */

import { isNodeRef } from "../graph/input-kinds";
import type { GNode } from "../graph/node";

export function toposort(nodes: readonly GNode[]): GNode[] {
	const state = new Map<GNode, "visiting" | "done">();
	const order: GNode[] = [];
	const stack: GNode[] = [];

	const visit = (node: GNode): void => {
		const s = state.get(node);
		if (s === "done") return;
		if (s === "visiting") throw cycleError(stack, node);
		state.set(node, "visiting");
		stack.push(node);
		for (const value of Object.values(node.inputs)) {
			if (isNodeRef(value)) visit(value.node);
		}
		stack.pop();
		state.set(node, "done");
		order.push(node);
	};

	for (const node of nodes) visit(node);
	return order;
}

function cycleError(stack: readonly GNode[], repeat: GNode): Error {
	const from = stack.indexOf(repeat);
	const cycle = [...stack.slice(from), repeat].map(describe).join(" -> ");
	return new Error(
		`cycle without a unit delay: ${cycle}. Feedback must pass through loop() (a z1 back-edge).`,
	);
}

function describe(node: GNode): string {
	return node.pin !== undefined ? `${node.module}#${node.pin}` : node.module;
}
