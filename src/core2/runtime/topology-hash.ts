import type { WorkletGraph, WorkletInput, WorkletNode, WorkletStereoGraph } from "./worklet-types";

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
function hashInput(input: WorkletInput, nodeHashes: Map<string, TopologyHash>): string {
	if (input.type === "constant") {
		return "const";
	}
	if (input.type === "lambda") {
		return "lambda";
	}
	// Connection
	const sourceHash = nodeHashes.get(input.nodeId);
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
	node: WorkletNode,
	specs: Record<string, { processSource: string }>,
	nodeHashes: Map<string, TopologyHash>,
): TopologyHash {
	const parts: string[] = [];

	// Device type identity: use process function source
	const spec = specs[node.device];
	parts.push(`type:${spec?.processSource ?? node.device}`);

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

interface GraphLike {
	specs: Record<string, { processSource: string }>;
	nodes: readonly WorkletNode[];
}

/**
 * Compute topology hashes for all nodes in a compiled graph.
 * Nodes must be in topological order (dependencies first).
 */
function computeGraphHashes(graph: GraphLike): Map<string, TopologyHash> {
	const hashes = new Map<string, TopologyHash>();
	for (const node of graph.nodes) {
		const hash = computeNodeHash(node, graph.specs, hashes);
		hashes.set(node.id, hash);
	}
	return hashes;
}

/**
 * Diff two graphs to find node correspondence by topology.
 * Returns a map from new node ID to old node ID for matched nodes.
 *
 * When multiple nodes have the same hash (e.g., multiple seqs connected
 * to the same clock), we match them by position within their hash group.
 */
function diffGraphs(oldGraph: GraphLike, newGraph: GraphLike): Map<string, string> {
	const oldHashes = computeGraphHashes(oldGraph);
	const newHashes = computeGraphHashes(newGraph);

	// Build reverse map: hash → list of old node IDs (preserving order)
	const oldByHash = new Map<TopologyHash, string[]>();
	for (const [id, hash] of oldHashes) {
		const existing = oldByHash.get(hash);
		if (existing) {
			existing.push(id);
		} else {
			oldByHash.set(hash, [id]);
		}
	}

	// Track which old nodes within each hash group have been matched
	const hashMatchIndex = new Map<TopologyHash, number>();

	// Match new nodes to old nodes by hash, respecting order within hash groups
	const matched = new Map<string, string>();
	for (const [newId, hash] of newHashes) {
		const oldIds = oldByHash.get(hash);
		if (oldIds) {
			const index = hashMatchIndex.get(hash) ?? 0;
			if (index < oldIds.length) {
				matched.set(newId, oldIds[index]!);
				hashMatchIndex.set(hash, index + 1);
			}
		}
	}

	return matched;
}

/** Diff stereo graphs - works with the single-graph stereo format */
export function diffStereoGraphs(
	oldGraph: WorkletStereoGraph,
	newGraph: WorkletStereoGraph,
): Map<string, string> {
	return diffGraphs(oldGraph, newGraph);
}
