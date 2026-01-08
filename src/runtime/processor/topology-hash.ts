import type { CompiledInput, CompiledNode } from "./types";

export type TopologyHash = string;

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
	return Math.abs(hash).toString(36);
}

/**
 * Hash an input binding for topology identity.
 * Constants become "const" (value excluded for stability).
 * Connections become the source node's hash + output name.
 */
function hashInput(
	input: CompiledInput,
	nodeHashes: Map<string, TopologyHash>,
): string {
	if (input.type === "constant") {
		return "const";
	}
	const sourceHash = nodeHashes.get(input.nodeId ?? "");
	if (!sourceHash) {
		return "unknown";
	}
	return `${sourceHash}.${input.output}`;
}

/**
 * Compute topology hash for a compiled node.
 * Based on device type (process source) and input connection structure.
 *
 * Config is EXCLUDED from the hash so that changing parameters (BPM, pattern)
 * still matches to the same node. This enables:
 * - Clock state preserved when BPM changes (phase continuity)
 * - Seq matches when pattern changes (position preserved)
 *
 * State clearing for config-derived caches (like seq's parsed pattern) happens
 * in hydrateGraph, not via hash differentiation.
 */
function computeNodeHash(
	node: CompiledNode,
	nodeHashes: Map<string, TopologyHash>,
): TopologyHash {
	const parts: string[] = [];

	// Device type identity: use process function source
	parts.push(`type:${node.spec.processSource}`);

	// Input connection structure (sorted for determinism)
	const inputNames = Object.keys(node.inputs).sort();
	for (const inputName of inputNames) {
		const input = node.inputs[inputName];
		if (input) {
			parts.push(`in:${inputName}:${hashInput(input, nodeHashes)}`);
		}
	}

	// Config is intentionally NOT included - we want nodes to match
	// even when their config changes (BPM, pattern, etc.)

	return simpleHash(parts.join("|"));
}

/**
 * Compute topology hashes for all nodes in a compiled graph.
 * Nodes must be in topological order (dependencies first).
 */
function computeGraphHashes(nodes: readonly CompiledNode[]): Map<string, TopologyHash> {
	const hashes = new Map<string, TopologyHash>();
	for (const node of nodes) {
		const hash = computeNodeHash(node, hashes);
		hashes.set(node.id, hash);
	}
	return hashes;
}

/**
 * Diff two graphs to find node correspondence by topology.
 * Returns a map from new node ID to old node ID for matched nodes.
 */
export function diffGraphs(
	oldNodes: readonly CompiledNode[],
	newNodes: readonly CompiledNode[],
): Map<string, string> {
	const oldHashes = computeGraphHashes(oldNodes);
	const newHashes = computeGraphHashes(newNodes);

	// Build reverse map: hash → old node ID
	const oldByHash = new Map<TopologyHash, string>();
	for (const [id, hash] of oldHashes) {
		oldByHash.set(hash, id);
	}

	// Match new nodes to old nodes by hash
	const matched = new Map<string, string>();
	for (const [newId, hash] of newHashes) {
		const oldId = oldByHash.get(hash);
		if (oldId !== undefined) {
			matched.set(newId, oldId);
		}
	}

	return matched;
}
