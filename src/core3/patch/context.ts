/**
 * Eval context — the ONLY mutable state in the patch layer, and it exists
 * only for the duration of one `runEval` call. `out()` pushes roots,
 * `clock()` binds the ambient clock, factories construct nodes; all of them
 * fail loudly outside runEval. `defmod()` is the one scope-aware citizen: a
 * live context routes its registrations into this eval's spec table; outside
 * one it falls through to the realm registry (module/define).
 */

import type { GNode } from "../graph/node";
import type { ModuleSpec } from "../types";

export interface EvalResult {
	/** The `out` nodes, in call order. Compile walks reachability from these. */
	readonly roots: GNode[];
	/** Ambient clock: first clock(bpm) call inside the eval. */
	readonly clock: GNode | null;
	readonly seed: number;
	/** Patch-defined module specs (defmod), scoped to this eval only. */
	readonly specs: ReadonlyMap<string, ModuleSpec>;
}

interface EvalCtx {
	roots: GNode[];
	clock: GNode | null;
	seed: number;
	/** Patch-defined module specs (defmod), scoped to this eval only. */
	specs: Map<string, ModuleSpec>;
}

let current: EvalCtx | null = null;

export function runEval(fn: () => void, opts: { seed?: number } = {}): EvalResult {
	if (current !== null) throw new Error("runEval: nested runEval is not allowed");
	const ctx: EvalCtx = { roots: [], clock: null, seed: opts.seed ?? 1, specs: new Map() };
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

/** The current eval's spec table, or null outside runEval (handles probed outside eval must not explode). */
export function currentSpecs(): ReadonlyMap<string, ModuleSpec> | null {
	return current?.specs ?? null;
}
