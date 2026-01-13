/**
 * GraphBuilder - accumulates nodes during API execution.
 *
 * Central collector that devices add nodes to. Reset between evaluations.
 * During expand(), we swap in a temporary builder to capture created nodes.
 */

import type { FlatGraph } from "./flat-graph";
import type { Node, NodeId } from "./node";

export class GraphBuilder {
	private nodes: Map<NodeId, Node> = new Map();

	addNode(node: Node): void {
		this.nodes.set(node.id, node);
	}

	getNode(id: NodeId): Node | undefined {
		return this.nodes.get(id);
	}

	getNodes(): Node[] {
		return Array.from(this.nodes.values());
	}

	build(): FlatGraph {
		return {
			nodes: this.getNodes(),
		};
	}
}

// Global instance, reset between evaluations
let currentBuilder: GraphBuilder | null = null;

export function getBuilder(): GraphBuilder {
	if (!currentBuilder) {
		currentBuilder = new GraphBuilder();
	}
	return currentBuilder;
}

export function resetBuilder(): void {
	currentBuilder = new GraphBuilder();
}

/**
 * Swap in a new builder, run a function, swap back.
 * Returns the nodes created during the function execution.
 */
export function withBuilder<T>(fn: () => T): { result: T; nodes: Node[] } {
	const previous = currentBuilder;
	const temp = new GraphBuilder();
	currentBuilder = temp;
	try {
		const result = fn();
		return { result, nodes: temp.getNodes() };
	} finally {
		currentBuilder = previous;
	}
}
