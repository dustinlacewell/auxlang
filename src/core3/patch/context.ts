/**
 * Eval context — the ONLY mutable state in the patch layer, and it exists
 * only for the duration of one `runEval` call. `out()` pushes roots,
 * `tempo()` sets the ambient clock, `seed()` pins the patch seed, factories
 * construct nodes; all of them
 * fail loudly outside runEval. `defmod()` is the one scope-aware citizen: a
 * live context routes its registrations into this eval's spec table; outside
 * one it falls through to the realm registry (module/define).
 */

import type { GNode } from "../graph/node";
import { DEFAULT_SEED } from "../random/default-seed";
import type { ModuleSpec } from "../types";

export interface EvalResult {
	/** The `out` nodes, in call order. Compile walks reachability from these. */
	readonly roots: GNode[];
	/** Ambient clock: the eval's one tempo(bpm) setting, read when eval has finished. */
	readonly clock: GNode | null;
	/** The patch seed: the eval's one seed(n) setting, else the `seed` option, else DEFAULT_SEED. */
	readonly seed: number;
	/** True when the patch set its own seed with seed(n); a host's drawn seed then has no effect. */
	readonly seedPinned: boolean;
	/** Patch-defined module specs (defmod), scoped to this eval only. */
	readonly specs: ReadonlyMap<string, ModuleSpec>;
}

interface EvalCtx {
	roots: GNode[];
	clock: GNode | null;
	seed: number;
	seedPinned: boolean;
	/** Patch-defined module specs (defmod), scoped to this eval only. */
	specs: Map<string, ModuleSpec>;
}

let current: EvalCtx | null = null;

export function runEval(fn: () => void, opts: { seed?: number } = {}): EvalResult {
	if (current !== null) throw new Error("runEval: nested runEval is not allowed");
	const ctx: EvalCtx = {
		roots: [],
		clock: null,
		seed: opts.seed ?? DEFAULT_SEED,
		seedPinned: false,
		specs: new Map(),
	};
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
