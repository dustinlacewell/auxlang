/**
 * Structural period of a pattern: the number of cycles after which its event
 * layout repeats. Warps that only reshape time within a cycle (rev, shift,
 * arithmetic) are period 1; cat/alternation/stretch ops multiply it.
 *
 * The seq bridge uses this to size a query window that is guaranteed to contain
 * the pattern's peak simultaneity — a fixed window can miss both a late-entering
 * voice (width 0, a crash) and a chord that only appears in a later cycle
 * (undercount, silently dropped voices). Capped so a pathological nest can't
 * make the build-time width query unbounded; past the cap we sample a prefix.
 */

import type { Pat } from "./ast";

const CAP = 720;

function gcd(x: number, y: number): number {
	let a = Math.abs(x);
	let b = Math.abs(y);
	while (b) [a, b] = [b, a % b];
	return a || 1;
}

const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

const clamp = (n: number): number => Math.min(Math.max(1, Math.round(n)), CAP);

/** Cycles after which `pat` repeats, floored at 1 and capped at 720. */
export function period(pat: Pat): number {
	switch (pat.op) {
		case "pure":
		case "silence":
			return 1;
		case "fastcat":
			return clamp(pat.children.reduce((acc, wc) => lcm(acc, period(wc.pat)), 1));
		case "stack":
			return clamp(pat.children.reduce((acc, c) => lcm(acc, period(c)), 1));
		case "slowcat":
			return clamp(pat.children.reduce((acc, c) => lcm(acc, period(c)), pat.children.length));
		case "slow":
			return clamp((pat.factor.n / pat.factor.d) * period(pat.child));
		case "fast":
			return period(pat.child); // sub-cycle repetition; still repeats each cycle
		case "iter":
		case "ply":
			return clamp(lcm(pat.n, period(pat.child)));
		case "every":
			return clamp(lcm(pat.n, lcm(period(pat.child), period(pat.transformed))));
		case "euclid":
			return period(pat.child);
		case "mask":
		case "struct":
			return clamp(lcm(period(pat.bool), period(pat.child)));
		case "chunk":
			return clamp(lcm(pat.n, lcm(period(pat.child), period(pat.transformed))));
		case "sometimesBy":
			return clamp(lcm(period(pat.child), period(pat.transformed)));
		case "segment":
			return period(pat.child);
		case "signal":
			return 1;
		case "chordidx":
			return clamp(lcm(pat.per * pat.tables.length, period(pat.child)));
		case "clip":
		case "rev":
		case "early":
		case "late":
		case "degrade":
		case "add":
		case "mul":
		case "tieNext":
		case "tiePrev":
			return period(pat.child);
	}
}
