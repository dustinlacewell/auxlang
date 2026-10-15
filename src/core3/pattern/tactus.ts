/**
 * Tactus: how many steps a pattern counts per cycle, computed from its
 * structure (like `width`, never by querying). `polymeter` uses it to align
 * layers. The rules follow Strudel's step counts:
 *
 * - a sequence counts its steps: `fastcat` its children, `timecat` its weights;
 * - `stack` and `slowcat` take the least common multiple of their children;
 * - `polymeter` plays its first layer's steps;
 * - `ply(n)` multiplies, `euclid` and `segment` count their own steps,
 *   `struct` counts its boolean pattern's steps;
 * - a single event (`pure`, `silence`, `signal`) is one step;
 * - every other op keeps its child's count. `fast` and `slow` change speed,
 *   not the step count.
 *
 * Pats are immutable data, so step counts are memoized per node.
 */

import type { Layer, Pat } from "./ast";
import { type R, R0, R1, r, radd, rlcm, rmul } from "./rational";

const memo = new WeakMap<Pat, R>();

/** Steps per cycle of `pat`; always positive. */
export function tactus(pat: Pat): R {
	let steps = memo.get(pat);
	if (steps === undefined) {
		steps = structuralTactus(pat);
		memo.set(pat, steps);
	}
	return steps;
}

const lcmOf = (pats: readonly Pat[]): R => pats.map(tactus).reduce(rlcm);

function structuralTactus(pat: Pat): R {
	switch (pat.op) {
		case "pure":
		case "silence":
		case "rest":
		case "tie":
		case "signal":
		case "steps": // one step per cycle
			return R1;
		case "fastcat":
			return r(pat.children.length);
		case "timecat":
			return pat.children.reduce((acc, wc) => radd(acc, wc.weight), R0);
		case "stack":
		case "slowcat":
			return lcmOf(pat.children);
		case "polymeter":
			return (pat.layers[0] as Layer).steps;
		case "ply":
			return rmul(tactus(pat.child), r(pat.n));
		case "euclid":
			return r(pat.steps);
		case "segment":
			return r(pat.n);
		case "struct":
			return tactus(pat.bool);
		case "fast":
		case "slow":
		case "rev":
		case "early":
		case "late":
		case "iter":
		case "degrade":
		case "seed":
		case "add":
		case "mul":
		case "every":
		case "slide":
		case "compact":
		case "mask":
		case "clip":
		case "chunk":
		case "sometimesBy":
		case "chordidx":
		case "voices":
			return tactus(pat.child);
	}
}
