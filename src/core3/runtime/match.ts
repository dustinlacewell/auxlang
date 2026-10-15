/**
 * Re-eval matching (MANIFESTO §6.2): pair each node of the new program with
 * the running node whose state it takes over. A reconciler, not a hash, so
 * rewiring resets nothing. Each pass pairs only nodes the earlier passes left
 * over:
 *
 *   1. pin             — `.id(name)` pins pair by name.
 *   2. place+upstream  — same place and same upstream signature: breaks ties
 *                        among nodes sharing a place, so swapped parallel
 *                        chains keep their own state.
 *   3. place           — same kind at the same place (path from an `out` root).
 *   4. kind            — the rest by kind.
 *
 * Within a pass, the k-th new node with a value pairs with the k-th old node
 * with that value, both in program order. Pass 2 never steals a unique place
 * match: a place with one old and one new node pairs them in pass 2 or 3
 * alike. A node no pass pairs is new and starts fresh.
 */

import type { Identity, KeyedIdentity } from "../types";

/** A pass's matching value; undefined takes no part in that pass. */
type Facet = (node: Identity) => string | undefined;

const PASSES: readonly Facet[] = [
	(n) => n.pin,
	(n) => `${n.place}|${n.upstream}`,
	(n) => n.place,
	(n) => n.kind,
];

/** New node index → the old node's migration key. */
export function match(
	old: readonly KeyedIdentity[],
	fresh: readonly Identity[],
): Map<number, string> {
	const paired = new Map<number, string>();
	const taken = new Set<number>();
	for (const facet of PASSES) pairBy(facet, old, fresh, paired, taken);
	return paired;
}

function pairBy(
	facet: Facet,
	old: readonly KeyedIdentity[],
	fresh: readonly Identity[],
	paired: Map<number, string>,
	taken: Set<number>,
): void {
	const queues = oldByFacet(facet, old, taken);
	fresh.forEach((node, i) => {
		if (paired.has(i)) return;
		const value = facet(node);
		const j = value === undefined ? undefined : queues.get(value)?.shift();
		if (j === undefined) return;
		paired.set(i, (old[j] as KeyedIdentity).key);
		taken.add(j);
	});
}

/** Unpaired old node indices grouped by facet value, each group in program order. */
function oldByFacet(
	facet: Facet,
	old: readonly KeyedIdentity[],
	taken: ReadonlySet<number>,
): Map<string, number[]> {
	const queues = new Map<string, number[]>();
	old.forEach((node, j) => {
		const value = facet(node);
		if (taken.has(j) || value === undefined) return;
		const queue = queues.get(value);
		if (queue === undefined) queues.set(value, [j]);
		else queue.push(j);
	});
	return queues;
}
