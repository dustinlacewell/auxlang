/**
 * Where voice histories live: per voices node (a WeakMap, so a dropped
 * pattern drops its histories) and per (seed, path), since randomness inside
 * the child depends on both. Each thread builds its own (the worklet rebuilds
 * them from the pattern data), and a re-eval starts fresh: histories are
 * derived data, never migrated state. A node read in more than
 * MAX_CONTEXTS contexts forgets the oldest; rebuilding one gives the same lanes.
 */

import type { Pat } from "../ast";
import type { History } from "./history";

export const MAX_CONTEXTS = 16;

const byNode = new WeakMap<Pat, Map<string, History>>();

export function historyFor(node: Pat, seed: number, path: number, create: () => History): History {
	let contexts = byNode.get(node);
	if (contexts === undefined) {
		contexts = new Map();
		byNode.set(node, contexts);
	}
	const key = `${seed}:${path}`;
	let h = contexts.get(key);
	if (h === undefined) {
		h = create();
		contexts.set(key, h);
		if (contexts.size > MAX_CONTEXTS) contexts.delete(contexts.keys().next().value as string);
	}
	return h;
}
