/**
 * Re-eval matching (MANIFESTO §6.2): pair each node of the new program with
 * the running node whose state it takes over. A reconciler, not a hash, so
 * rewiring resets nothing. Each pass pairs only nodes the earlier passes left
 * over:
 *
 *   1. pin             — `.id(name)` pins pair by name.
 *   2. place+upstream  — same place and same upstream signature: breaks ties
 *                        among nodes sharing a place, so swapped parallel
 *                        chains keep their own state. Within it, the most
 *                        shared constant evidence pairs first, so deleting one
 *                        of two near-identical chains leaves the survivor its
 *                        own state.
 *   3. place           — same kind at the same place (path from an `out` root).
 *   4. kind            — the rest by kind.
 *
 * Otherwise the k-th new node with a value pairs with the k-th old node with
 * that value, both in program order (pairings.ts). Pass 2 never steals a
 * unique place match: a place with one old and one new node pairs them in
 * pass 2 or 3 alike. A node no pass pairs is new and starts fresh.
 */

import type { Identity, KeyedIdentity } from "../types";
import { type Pairing, byEvidence, inOrder } from "./pairings";

interface Pass {
	/** The pass's matching value; undefined takes no part in it. */
	readonly facet: (node: Identity) => string | undefined;
	readonly pairing: Pairing;
}

const PASSES: readonly Pass[] = [
	{ facet: (n) => n.pin, pairing: inOrder },
	{ facet: (n) => `${n.place}|${n.upstream}`, pairing: byEvidence },
	{ facet: (n) => n.place, pairing: inOrder },
	{ facet: (n) => n.kind, pairing: inOrder },
];

/** New node index → the old node's migration key. */
export function match(
	old: readonly KeyedIdentity[],
	fresh: readonly Identity[],
): Map<number, string> {
	const paired = new Map<number, string>();
	const taken = new Set<number>();
	for (const pass of PASSES) {
		const olds = groupBy(pass.facet, old, (j) => !taken.has(j));
		const news = groupBy(pass.facet, fresh, (i) => !paired.has(i));
		for (const [value, group] of news) {
			for (const [i, j] of pass.pairing(olds.get(value) ?? [], group, old, fresh)) {
				paired.set(i, (old[j] as KeyedIdentity).key);
				taken.add(j);
			}
		}
	}
	return paired;
}

/** Indices of the open nodes grouped by facet value, each group in program order. */
function groupBy(
	facet: Pass["facet"],
	nodes: readonly Identity[],
	open: (index: number) => boolean,
): Map<string, number[]> {
	const groups = new Map<string, number[]>();
	nodes.forEach((node, index) => {
		const value = facet(node);
		if (value === undefined || !open(index)) return;
		const group = groups.get(value);
		if (group === undefined) groups.set(value, [index]);
		else group.push(index);
	});
	return groups;
}
