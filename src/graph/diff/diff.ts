/**
 * Graph diffing - compare old and new graphs to identify node correspondence.
 *
 * Used for live coding: when user re-evaluates code, we want to preserve
 * state for nodes that have the same topological position in the graph.
 */

import type { Graph, GraphNode } from "../types";
import { type TopologyHash, computeGraphHashes } from "./topology-hash";

/** Result of diffing two graphs */
export interface GraphDiff {
	/** Nodes in new graph that match nodes in old graph (by topology) */
	readonly matched: ReadonlyMap<string, MatchedNode>;
	/** Node IDs in new graph that have no match in old graph */
	readonly added: readonly string[];
	/** Node IDs in old graph that have no match in new graph */
	readonly removed: readonly string[];
}

/** A matched node pair */
export interface MatchedNode {
	/** Node ID in the old graph */
	readonly oldId: string;
	/** Node ID in the new graph */
	readonly newId: string;
	/** The topology hash they share */
	readonly hash: TopologyHash;
}

/**
 * Diff two graphs to find corresponding nodes.
 *
 * Nodes match if they have the same topology hash - same device type
 * and same input connection structure.
 */
export function diffGraphs(oldGraph: Graph, newGraph: Graph): GraphDiff {
	const oldHashes = computeGraphHashes(oldGraph.nodes);
	const newHashes = computeGraphHashes(newGraph.nodes);

	// Build reverse maps: hash → node ID
	const oldByHash = new Map<TopologyHash, string>();
	for (const [id, hash] of oldHashes) {
		// If multiple nodes have same hash, last one wins
		// This handles the case of duplicate devices
		oldByHash.set(hash, id);
	}

	const newByHash = new Map<TopologyHash, string>();
	for (const [id, hash] of newHashes) {
		newByHash.set(hash, id);
	}

	// Find matches
	const matched = new Map<string, MatchedNode>();
	const matchedOldIds = new Set<string>();
	const matchedNewIds = new Set<string>();

	for (const [newId, hash] of newHashes) {
		const oldId = oldByHash.get(hash);
		if (oldId !== undefined) {
			matched.set(newId, { oldId, newId, hash });
			matchedOldIds.add(oldId);
			matchedNewIds.add(newId);
		}
	}

	// Find added (in new but not matched)
	const added: string[] = [];
	for (const node of newGraph.nodes) {
		if (!matchedNewIds.has(node.id)) {
			added.push(node.id);
		}
	}

	// Find removed (in old but not matched)
	const removed: string[] = [];
	for (const node of oldGraph.nodes) {
		if (!matchedOldIds.has(node.id)) {
			removed.push(node.id);
		}
	}

	return { matched, added, removed };
}

/**
 * Check if two graphs are topologically equivalent.
 * (Same structure, possibly different values)
 */
export function graphsEquivalent(oldGraph: Graph, newGraph: Graph): boolean {
	if (oldGraph.nodes.length !== newGraph.nodes.length) {
		return false;
	}

	const diff = diffGraphs(oldGraph, newGraph);
	return diff.added.length === 0 && diff.removed.length === 0;
}
