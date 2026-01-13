/**
 * GraphBuilder - accumulates nodes during API execution.
 *
 * Central collector that devices add nodes to. Reset between evaluations.
 */

import type { FlatGraph } from "./flat-graph";
import type { Node, NodeId } from "./node";

export class GraphBuilder {
	private nodes: Map<NodeId, Node> = new Map();

	addNode(node: Node): void {
		this.nodes.set(node.id, node);
	}

	build(): FlatGraph {
		return {
			nodes: Array.from(this.nodes.values()),
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
