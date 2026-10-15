/**
 * Static width (§3.2): how many lanes a pattern needs, computed from its
 * structure — never by querying. `stack` and `polymeter` sum, sequences
 * (`fastcat`, `timecat`, `slowcat`) take the max, `every` takes the max of both
 * branches, `off` sums (it is a stack).
 *
 * The rules match how `query` numbers lanes: a stack offsets each child's lanes
 * by the widths of the children before it, and every other op keeps its
 * children's lanes. So every event's lane is below the width by construction,
 * and two events in one lane never overlap in time.
 *
 * Pats are immutable data, so widths are memoized per node.
 */

import type { Pat } from "./ast";

const memo = new WeakMap<Pat, number>();

/** Lanes `pat` needs. Silence needs 0; seq floors its node at 1. */
export function width(pat: Pat): number {
	let w = memo.get(pat);
	if (w === undefined) {
		w = structuralWidth(pat);
		memo.set(pat, w);
	}
	return w;
}

const sum = (pats: readonly Pat[]): number => pats.reduce((acc, p) => acc + width(p), 0);
const max = (pats: readonly Pat[]): number => pats.reduce((acc, p) => Math.max(acc, width(p)), 0);

function structuralWidth(pat: Pat): number {
	switch (pat.op) {
		case "silence":
			return 0;
		case "pure":
		case "rest":
		case "signal":
		case "segment": // fresh events, one per step, all in lane 0
			return 1;
		case "tie":
			return pat.lanes;
		case "euclid": // an empty slot is a rest in lane 0
			return Math.max(1, width(pat.child));
		case "stack":
			return sum(pat.children);
		case "polymeter":
			return sum(pat.layers.map((layer) => layer.pat));
		case "fastcat":
			return max(pat.children);
		case "timecat":
			return max(pat.children.map((wc) => wc.pat));
		case "slowcat":
			return max(pat.children);
		case "every":
			return max([pat.child, pat.transformed]);
		case "chunk": // a child event can ring on into the transformed slice
			return sum([pat.child, pat.transformed]);
		case "struct": // events come from bool's onsets
			return width(pat.bool);
		case "voices":
			return pat.n;
		case "fast":
		case "slow":
		case "rev":
		case "early":
		case "late":
		case "iter":
		case "swing":
		case "ply":
		case "degrade":
		case "seed":
		case "add":
		case "mul":
		case "slide":
		case "steps":
		case "compact":
		case "mask":
		case "clip":
		case "sometimesBy": // structure from child; transformed only lends values
		case "chordidx":
			return width(pat.child);
	}
}
