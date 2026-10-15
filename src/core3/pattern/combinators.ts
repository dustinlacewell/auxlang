/**
 * AST constructors — one plain function per Pat op. These are the whole
 * pattern algebra; notation and the fluent P class are sugar over them.
 * Validation is loud and happens here, at build time.
 */

import type { Pat, SignalKind, VoicePolicy, WChild } from "./ast";
import { type R, r } from "./rational";
import { tactus } from "./tactus";
import { width } from "./widths";

const asR = (x: number | R): R => (typeof x === "number" ? r(x) : x);

function positiveInt(n: number, op: string): number {
	if (!Number.isInteger(n) || n <= 0) {
		throw new Error(`${op}: n must be a positive integer, got ${n}`);
	}
	return n;
}

export const pure = (value: number): Pat => ({ op: "pure", value });

export const silence = (): Pat => ({ op: "silence" });

/** A rest: a step with its gate off. */
export const rest = (): Pat => ({ op: "rest" });

/** A tie in each of `lanes` lanes: continues the note before it. */
export const tie = (lanes: number): Pat => ({ op: "tie", lanes: positiveInt(lanes, "tie") });

/** The child's notes become slides: entered from the previous note without a retrigger. */
export const slide = (child: Pat): Pat => ({ op: "slide", child });

/** Equal subdivision of one cycle. */
export function fastcat(children: readonly Pat[]): Pat {
	if (children.length === 0) throw new Error("fastcat: needs at least one child");
	return { op: "fastcat", children };
}

/** Weighted subdivision of one cycle: `timecat([[2, a], [1, b]])` gives a two thirds. */
export function timecat(children: readonly (readonly [number | R, Pat])[]): Pat {
	if (children.length === 0) throw new Error("timecat: needs at least one child");
	const weighted: WChild[] = children.map(([weight, pat]) => {
		const w = asR(weight);
		if (w.n <= 0) throw new Error(`timecat: weights must be positive, got ${w.n}/${w.d}`);
		return { pat, weight: w };
	});
	return { op: "timecat", children: weighted };
}

/**
 * Layers played together, each at the first layer's steps per cycle:
 * `polymeter([abc, de])` plays d e d, e d e against a b c. A layer's step
 * count is its tactus.
 */
export function polymeter(layers: readonly Pat[]): Pat {
	if (layers.length === 0) throw new Error("polymeter: needs at least one layer");
	return { op: "polymeter", layers: layers.map((pat) => ({ pat, steps: tactus(pat) })) };
}

/** One child per cycle, round-robin. */
export function slowcat(children: readonly Pat[]): Pat {
	if (children.length === 0) throw new Error("slowcat: needs at least one child");
	return { op: "slowcat", children };
}

export function stack(children: readonly Pat[]): Pat {
	if (children.length === 0) throw new Error("stack: needs at least one child");
	return { op: "stack", children };
}

export function fast(factor: number | R, child: Pat): Pat {
	const f = asR(factor);
	if (f.n <= 0) throw new Error("fast: factor must be positive");
	return { op: "fast", factor: f, child };
}

export function slow(factor: number | R, child: Pat): Pat {
	const f = asR(factor);
	if (f.n <= 0) throw new Error("slow: factor must be positive");
	return { op: "slow", factor: f, child };
}

export const rev = (child: Pat): Pat => ({ op: "rev", child });

export const early = (amount: number | R, child: Pat): Pat => ({
	op: "early",
	amount: asR(amount),
	child,
});

export const late = (amount: number | R, child: Pat): Pat => ({
	op: "late",
	amount: asR(amount),
	child,
});

export const iter = (n: number, child: Pat): Pat => ({
	op: "iter",
	n: positiveInt(n, "iter"),
	child,
});

export const ply = (n: number, child: Pat): Pat => ({ op: "ply", n: positiveInt(n, "ply"), child });

export function euclid(k: number, steps: number, rot: number, child: Pat): Pat {
	if (!Number.isInteger(k) || !Number.isInteger(steps) || !Number.isInteger(rot)) {
		throw new Error(`euclid: k, steps, rot must be integers, got (${k}, ${steps}, ${rot})`);
	}
	if (steps <= 0 || k < 0 || k > steps) {
		throw new Error(`euclid: need 0 <= k <= steps, steps > 0, got (${k}, ${steps})`);
	}
	return { op: "euclid", k, steps, rot, child };
}

export function degrade(prob: number, child: Pat): Pat {
	if (!(prob >= 0 && prob <= 1)) throw new Error(`degrade: prob must be in [0,1], got ${prob}`);
	return { op: "degrade", prob, child };
}

export const add = (amount: number, child: Pat): Pat => ({ op: "add", amount, child });

export const mul = (amount: number, child: Pat): Pat => ({ op: "mul", amount, child });

/** Applies f at BUILD time; query picks `transformed` when cycle % n === 0. */
export function every(n: number, f: (child: Pat) => Pat, child: Pat): Pat {
	return { op: "every", n: positiveInt(n, "every"), child, transformed: f(child) };
}

export const mask = (bool: Pat, child: Pat): Pat => ({ op: "mask", bool, child });

export const struct = (bool: Pat, child: Pat): Pat => ({ op: "struct", bool, child });

export const segment = (n: number, child: Pat): Pat => ({
	op: "segment",
	n: positiveInt(n, "segment"),
	child,
});

export function clip(factor: number, child: Pat): Pat {
	if (!(factor >= 0)) throw new Error(`clip: factor must be >= 0, got ${factor}`);
	return { op: "clip", factor, child };
}

/** every(n)-family with a rotating slice. f applies at build time to child. */
export function chunk(n: number, f: (child: Pat) => Pat, child: Pat): Pat {
	return { op: "chunk", n: positiveInt(n, "chunk"), child, transformed: f(child) };
}

export function sometimesBy(prob: number, f: (child: Pat) => Pat, child: Pat): Pat {
	if (!(prob >= 0 && prob <= 1)) throw new Error(`sometimesBy: prob must be in [0,1], got ${prob}`);
	return { op: "sometimesBy", prob, child, transformed: f(child) };
}

export const signal = (kind: SignalKind): Pat => ({ op: "signal", kind });

export function chordidx(
	tables: readonly (readonly number[])[],
	per: number,
	child: Pat,
): Pat {
	if (tables.length === 0) throw new Error("chordidx: needs at least one tone table");
	if (tables.some((t) => t.length === 0)) throw new Error("chordidx: tone tables must be non-empty");
	return { op: "chordidx", tables, per: positiveInt(per, "chordidx"), child };
}

const VOICE_POLICIES: readonly VoicePolicy[] = ["packed"];

/**
 * Assign events to `n` lanes (§3.5). `n` defaults to the structural width;
 * an explicit `n` below it would leave events with no lane, so it is an error.
 */
export function voices(policy: string, n: number | undefined, child: Pat): Pat {
	const known = VOICE_POLICIES.find((p) => p === policy);
	if (!known) {
		throw new Error(`voices: unknown policy '${policy}'; available: ${VOICE_POLICIES.join(", ")}`);
	}
	const needed = width(child);
	if (n === undefined) return { op: "voices", policy: known, n: needed, child };
	const lanes = positiveInt(n, "voices");
	if (lanes < needed) {
		throw new Error(
			`voices("${policy}", ${n}): the pattern needs ${needed} lanes (its structural width); n must be at least ${needed}`,
		);
	}
	return { op: "voices", policy: known, n: lanes, child };
}
