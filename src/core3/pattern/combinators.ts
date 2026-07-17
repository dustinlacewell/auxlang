/**
 * AST constructors — one plain function per Pat op. These are the whole
 * pattern algebra; notation and the fluent P class are sugar over them.
 * Validation is loud and happens here, at build time.
 */

import type { Pat, WChild } from "./ast";
import { R1, type R, r } from "./rational";

const asR = (x: number | R): R => (typeof x === "number" ? r(x) : x);

function positiveInt(n: number, op: string): number {
	if (!Number.isInteger(n) || n <= 0) {
		throw new Error(`${op}: n must be a positive integer, got ${n}`);
	}
	return n;
}

export const pure = (value: number): Pat => ({ op: "pure", value });

export const silence = (): Pat => ({ op: "silence" });

/** Weighted fastcat child (`a@2` => weight 2). */
export const wchild = (pat: Pat, weight: number | R): WChild => ({ pat, weight: asR(weight) });

/** Weighted subdivision of one cycle. Plain Pats get weight 1. */
export function fastcat(children: readonly (Pat | WChild)[]): Pat {
	if (children.length === 0) throw new Error("fastcat: needs at least one child");
	const weighted = children.map((c) => ("op" in c ? { pat: c, weight: R1 } : c));
	return { op: "fastcat", children: weighted };
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

export const tieNext = (child: Pat): Pat => ({ op: "tieNext", child });

export const tiePrev = (child: Pat): Pat => ({ op: "tiePrev", child });
