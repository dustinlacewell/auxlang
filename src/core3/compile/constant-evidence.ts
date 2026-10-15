/**
 * Each node's constant evidence: the sorted, distinct hashes of every constant
 * input value and config entry on the node and on every node upstream of it
 * (each entry names its module and port or config key). Constants are not
 * identity: the matcher uses this only to break ties among candidates that
 * already agree on place and upstream signature (runtime/match.ts), so
 * deleting one of two near-identical chains leaves the survivor its own state.
 * Computed in topo order; z-edge sources are not followed (they come later in
 * the order, and following them would loop).
 */

import { isNodeRef } from "../graph/input-kinds";
import type { GNode } from "../graph/node";
import { fnv1a32 } from "../hash/fnv1a32";

/** `order` must be topologically sorted (z-edges cut). */
export function constantEvidence(order: readonly GNode[]): Map<GNode, number[]> {
	const sets = new Map<GNode, Set<number>>();
	for (const node of order) {
		const set = new Set(ownEntries(node));
		for (const value of Object.values(node.inputs)) {
			if (!isNodeRef(value)) continue;
			for (const entry of sets.get(value.node) ?? []) set.add(entry);
		}
		sets.set(node, set);
	}
	return new Map([...sets].map(([node, set]) => [node, [...set].sort((a, b) => a - b)]));
}

function ownEntries(node: GNode): number[] {
	const inputs = Object.entries(node.inputs)
		.filter(([, value]) => typeof value === "number")
		.map(([port, value]) => `${node.module}.${port}=${value}`);
	const config = Object.entries(node.config)
		.filter(([key]) => !key.startsWith("__"))
		.map(([key, value]) => `${node.module}#${key}=${JSON.stringify(value)}`);
	return [...inputs, ...config].map(fnv1a32);
}
