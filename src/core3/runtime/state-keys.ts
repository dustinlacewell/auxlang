/**
 * Migration key assignment: one unique key per node, under which its state is
 * carried (collectState) and from which its random streams are seeded
 * (random/stream-seed.ts).
 *
 *   - A pinned node's key is its pin.
 *   - An unpinned node the matcher paired (match.ts) keeps the old node's key,
 *     so the key follows the match across any number of re-evals.
 *   - Any other node's key is its place.
 *
 * Duplicates take a `~k` suffix in program order (the first free one). With
 * nothing paired — a fresh patch — every key comes from the graph alone, so
 * the same patch and seed reproduce exactly.
 */

import type { Identity } from "../types";

export function migrationKeys(
	nodes: readonly Identity[],
	paired: ReadonlyMap<number, string>,
): string[] {
	const keys = nodes.map((node, i) => (node.pin === undefined ? paired.get(i) : undefined));
	const used = new Set(keys.filter((key): key is string => key !== undefined));
	return nodes.map((node, i) => keys[i] ?? claim(node.pin ?? node.place, used));
}

/** The first of `base`, `base~1`, `base~2`, … not yet used, marked used. */
function claim(base: string, used: Set<string>): string {
	let key = base;
	for (let k = 1; used.has(key); k++) key = `${base}~${k}`;
	used.add(key);
	return key;
}
