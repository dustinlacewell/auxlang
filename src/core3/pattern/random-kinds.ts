/**
 * Whether seeded randomness can change event kinds somewhere in a pattern:
 * `degrade` (and `?`) turns notes into rests, `sometimesBy` can take a
 * transformed event's kind. Event times never depend on randomness; kinds may.
 */

import type { Pat } from "./ast";
import { childrenOf } from "./children";

const memo = new WeakMap<Pat, boolean>();

export function hasRandomKinds(pat: Pat): boolean {
	let found = memo.get(pat);
	if (found === undefined) {
		found =
			pat.op === "degrade" || pat.op === "sometimesBy" || childrenOf(pat).some(hasRandomKinds);
		memo.set(pat, found);
	}
	return found;
}
