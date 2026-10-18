/**
 * How one match group pairs: the old and new nodes that share a pass's value
 * (runtime/match.ts). Each takes both index lists in program order and
 * returns [new index, old index] pairs.
 */

import type { Identity } from "../types";

export type Pairing = (
	olds: readonly number[],
	news: readonly number[],
	old: readonly Identity[],
	fresh: readonly Identity[],
) => [number, number][];

/** The k-th new node pairs with the k-th old node. */
export const inOrder: Pairing = (olds, news) =>
	news.slice(0, olds.length).map((n, k) => [n, olds[k] as number]);

/**
 * The pairs that share the most constant evidence go first; equal evidence
 * falls back to code order (new index, then old index). Constants are not
 * identity — this only orders candidates that already tie.
 */
export const byEvidence: Pairing = (olds, news, old, fresh) => {
	const candidates = news.flatMap((n) =>
		olds.map((o) => ({ n, o, score: shared(fresh[n]?.constants, old[o]?.constants) })),
	);
	candidates.sort((a, b) => b.score - a.score || a.n - b.n || a.o - b.o);
	const usedNew = new Set<number>();
	const usedOld = new Set<number>();
	const pairs: [number, number][] = [];
	for (const { n, o } of candidates) {
		if (usedNew.has(n) || usedOld.has(o)) continue;
		usedNew.add(n);
		usedOld.add(o);
		pairs.push([n, o]);
	}
	return pairs;
};

/** How many entries two sorted, distinct lists have in common. */
function shared(a: readonly number[] = [], b: readonly number[] = []): number {
	let count = 0;
	for (let i = 0, j = 0; i < a.length && j < b.length; ) {
		const x = a[i] as number;
		const y = b[j] as number;
		if (x === y) count++;
		if (x <= y) i++;
		if (y <= x) j++;
	}
	return count;
}
