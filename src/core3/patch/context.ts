/**
 * Eval context — the ONLY mutable state in the patch layer, and it exists
 * only for the duration of one `runEval` call. `out()` pushes roots,
 * `clock()` binds the ambient clock, factories construct nodes; all of them
 * fail loudly outside runEval.
 */

import type { GNode } from "../graph/node";

export interface EvalResult {
	/** The `out` nodes, in call order. Compile walks reachability from these. */
	readonly roots: GNode[];
	/** Ambient clock: first clock(bpm) call inside the eval. */
	readonly clock: GNode | null;
	readonly seed: number;
}

interface EvalCtx {
	roots: GNode[];
	clock: GNode | null;
	seed: number;
}

let current: EvalCtx | null = null;

export function runEval(fn: () => void, opts: { seed?: number } = {}): EvalResult {
	if (current !== null) throw new Error("runEval: nested runEval is not allowed");
	const ctx: EvalCtx = { roots: [], clock: null, seed: opts.seed ?? 1 };
	current = ctx;
	try {
		fn();
	} finally {
		current = null;
	}
	return ctx;
}

/** Get the live context, or fail loudly naming the caller. */
export function evalCtx(caller: string): EvalCtx {
	if (current === null) {
		throw new Error(`${caller} may only be used inside runEval(() => { ... })`);
	}
	return current;
}
