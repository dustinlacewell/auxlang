/**
 * Period: how many cycles until a pattern's event times and kinds repeat,
 * computed from its structure (like `width`, never by querying). Values may
 * differ between periods (`degrade`'s rolls, `rand`); times never do.
 *
 * - a single event (`pure`, `rest`, `tie`, `silence`) and continuous
 *   signals and `segment` repeat every cycle;
 * - sequences, stacks, `mask`, `struct`, `every(n)`, `chunk(n)`, `iter(n)`
 *   take the least common multiple of their parts (and n);
 * - `with` takes the least common multiple of its child and its fields
 *   (field values repeat with their own patterns);
 * - `slowcat` of n children plays each child once every n cycles;
 * - `fast(f)` and `slow(f)` scale the child's period by 1/f and f, rounded
 *   up to whole cycles; `polymeter` layers are sped up the same way;
 * - `steps` repeats after the steps in one period of its child;
 * - `compact` drops rests: when randomness decides which events are rests,
 *   its step count has no period, so it is null;
 * - every other op keeps its child's period.
 *
 * null means no finite period. Pats are immutable data, so periods are
 * memoized per node.
 */

import type { Layer, Pat } from "./ast";
import { hasRandomKinds } from "./random-kinds";
import { type R, r, rdiv, rlcm } from "./rational";

const memo = new WeakMap<Pat, number | null>();

export function period(pat: Pat): number | null {
	let p = memo.get(pat);
	if (p === undefined) {
		p = structuralPeriod(pat);
		memo.set(pat, p);
	}
	return p;
}

const lcm = (a: number | null, b: number | null): number | null =>
	a === null || b === null ? null : rlcm(r(a), r(b)).n;

const lcmOf = (pats: readonly Pat[], start: number | null = 1): number | null =>
	pats.reduce<number | null>((acc, p) => lcm(acc, period(p)), start);

/** Whole cycles until a child of period `p`, played at `speed` times, repeats. */
function scaled(p: number | null, speed: R): number | null {
	return p === null ? null : rdiv(r(p), speed).n;
}

function structuralPeriod(pat: Pat): number | null {
	switch (pat.op) {
		case "pure":
		case "silence":
		case "rest":
		case "tie":
		case "signal":
		case "segment":
			return 1;
		case "fastcat":
		case "stack":
			return lcmOf(pat.children);
		case "timecat":
			return lcmOf(pat.children.map((wc) => wc.pat));
		case "slowcat":
			return slowcatPeriod(pat.children);
		case "polymeter":
			return polymeterPeriod(pat.layers);
		case "fast":
			return scaled(period(pat.child), pat.factor);
		case "slow":
			return scaled(period(pat.child), rdiv(r(1), pat.factor));
		case "iter":
			return lcmOf([pat.child], pat.n);
		case "every":
		case "chunk":
			return lcmOf([pat.child, pat.transformed], pat.n);
		case "mask":
		case "struct":
			return lcmOf([pat.bool, pat.child]);
		case "sometimesBy":
			return lcmOf([pat.child, pat.transformed]);
		case "with":
			return lcmOf([pat.child, ...pat.fields.map((field) => field.pat)]);
		case "steps":
			return pat.layers.reduce<number | null>((acc, layer) => lcm(acc, stepsInPeriod(layer.counts)), 1);
		case "compact":
			return hasRandomKinds(pat.child) ? null : period(pat.child);
		case "slide":
		case "rev":
		case "early":
		case "late":
		case "swing":
		case "ply":
		case "euclid":
		case "degrade":
		case "seed":
		case "add":
		case "mul":
		case "clip":
		case "chordidx":
		case "voices":
			return period(pat.child);
	}
}

/** Each child plays every nth cycle and sees its own cycle count advance by one each time. */
function slowcatPeriod(children: readonly Pat[]): number | null {
	const inner = lcmOf(children);
	return inner === null ? null : children.length * inner;
}

/** Each layer runs at the first layer's steps per cycle, like `fast(steps / layer.steps)`. */
function polymeterPeriod(layers: readonly Layer[]): number | null {
	const steps = (layers[0] as Layer).steps;
	return layers.reduce<number | null>(
		(acc, layer) => lcm(acc, scaled(period(layer.pat), rdiv(steps, layer.steps))),
		1,
	);
}

/** A stepped layer repeats after its steps in one period; an empty layer every cycle. */
function stepsInPeriod(counts: readonly number[]): number {
	return Math.max(1, counts.reduce((a, b) => a + b, 0));
}
