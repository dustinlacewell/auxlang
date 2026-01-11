/**
 * Topological identity hashing for graph nodes.
 *
 * A node's identity is derived from its position in the graph topology:
 * - Device type (process function source)
 * - Input connection structure (what outputs connect to what inputs)
 *
 * This identity is stable across re-evaluations as long as the
 * graph structure remains the same, even if values change.
 */

import type { GraphNode, ResolvedInput } from "../types";

/** A topological hash that identifies a node by its graph position */
export type TopologyHash = string;

/**
 * Compute topology hash for a node.
 *
 * The hash includes:
 * - Device type (process function source as identity)
 * - Input connection structure (which outputs connect to which inputs)
 *
 * The hash excludes:
 * - Constant input values (changing clock(120) to clock(130) preserves identity)
 * - Config values (changing seq pattern preserves identity)
 * - Sequential IDs
 */
export function computeTopologyHash(
	node: GraphNode,
	nodeHashes: Map<string, TopologyHash>,
): TopologyHash {
	const parts: string[] = [];

	// Device type identity: use process function source
	parts.push(`type:${node.spec.processSource}`);

	// Input connection structure (sorted for determinism)
	const inputNames = Object.keys(node.inputBindings).sort();
	for (const inputName of inputNames) {
		const input = node.inputBindings[inputName];
		if (input) {
			parts.push(`in:${inputName}:${hashInput(input, nodeHashes)}`);
		}
	}

	return simpleHash(parts.join("|"));
}

/**
 * Hash an input binding.
 * - Constants become "const" (value excluded for stability)
 * - Connections become the source node's hash + output name
 * - Multi-connections become hash of all sources joined
 * - Lambdas become "lambda" (source excluded for stability)
 */
function hashInput(input: ResolvedInput, nodeHashes: Map<string, TopologyHash>): string {
	if (input.type === "constant") {
		return "const";
	}
	if (input.type === "lambda") {
		return "lambda";
	}
	if (input.type === "connections") {
		// Hash all source connections
		const hashes = input.sources.map((src) => {
			const sourceHash = nodeHashes.get(src.nodeId);
			if (!sourceHash) {
				throw new Error(`Missing hash for node ${src.nodeId}`);
			}
			return `${sourceHash}.${src.output}`;
		});
		return `[${hashes.join(",")}]`;
	}
	// Single connection: use the source node's topology hash
	const sourceHash = nodeHashes.get(input.nodeId);
	if (!sourceHash) {
		throw new Error(`Missing hash for node ${input.nodeId}`);
	}
	return `${sourceHash}.${input.output}`;
}

/**
 * Simple string hash function.
 * We don't need cryptographic strength, just uniqueness.
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	// Convert to base36 for shorter strings
	return Math.abs(hash).toString(36);
}

/**
 * Compute topology hashes for all nodes in a graph.
 *
 * Nodes must be in topological order (dependencies first)
 * so that when we hash a node, its dependencies already have hashes.
 */
export function computeGraphHashes(nodes: readonly GraphNode[]): Map<string, TopologyHash> {
	const hashes = new Map<string, TopologyHash>();

	for (const node of nodes) {
		const hash = computeTopologyHash(node, hashes);
		hashes.set(node.id, hash);
	}

	return hashes;
}
