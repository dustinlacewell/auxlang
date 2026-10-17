/**
 * Eval context — the ONLY mutable state in the patch layer, and it exists
 * only for the duration of one `runEval` call. `out()` pushes roots,
 * `tempo()` sets the ambient clock, `seed()` pins the patch seed, factories
 * construct nodes; all of them
 * fail loudly outside runEval. `defmod()` is the one scope-aware citizen: a
 * live context routes its registrations into this eval's spec table; outside
 * one it falls through to the realm registry (module/define).
 *
 * Compile reopens a context for each sub-patch instance it expands
 * (`runInScope`): the instance's `patch` builds nodes like any patch code,
 * and every node built there carries the instance's scope.
 */

import type { GNode } from "../graph/node";
import type { Scope } from "../graph/scope";
import { DEFAULT_SEED } from "../random/default-seed";
import type { ModuleSpec } from "../types";
import type { SubpatchSpec } from "./subpatch/subpatch-spec";

export interface EvalResult {
	/** The `out` nodes, in call order. Compile walks reachability from these, and mixes them to the master bus. */
	readonly roots: GNode[];
	/**
	 * Nodes that run but do not reach the master bus (patch/root-display.ts: a
	 * display-declaring module, rooted whether or not it reaches `out()`).
	 * Compile walks reachability from these too, but `program.outs` (the
	 * master-bus mix) never does.
	 */
	readonly kept: GNode[];
	/** Ambient clock: the eval's one tempo(bpm) setting, read when eval has finished. */
	readonly clock: GNode | null;
	/** The patch seed: the eval's one seed(n) setting, else the `seed` option, else DEFAULT_SEED. */
	readonly seed: number;
	/** True when the patch set its own seed with seed(n); a host's drawn seed then has no effect. */
	readonly seedPinned: boolean;
	/** Patch-defined module specs (defmod), scoped to this eval only. */
	readonly specs: ReadonlyMap<string, ModuleSpec>;
	/** Patch-defined sub-patch modules (defmod with `patch`), scoped to this eval only. */
	readonly subpatches: ReadonlyMap<string, SubpatchSpec>;
	/** Number-literal sites whose bindings compile to live slots (compile/bind-slots.ts). */
	readonly slotSites?: ReadonlySet<number>;
}

export interface EvalOptions {
	/** The host's seed; a patch's own seed(n) wins. */
	readonly seed?: number;
	/** Number-literal sites the editor drags: each binding from one becomes a live slot. */
	readonly slotSites?: ReadonlySet<number>;
}

interface EvalCtx {
	roots: GNode[];
	kept: GNode[];
	clock: GNode | null;
	seed: number;
	seedPinned: boolean;
	/** Patch-defined module specs (defmod), scoped to this eval only. */
	specs: Map<string, ModuleSpec>;
	/** Patch-defined sub-patch modules, scoped to this eval only. */
	subpatches: Map<string, SubpatchSpec>;
	/** The sub-patch instance being built, while compile expands one. */
	scope: Scope | null;
}

let current: EvalCtx | null = null;

export function runEval(fn: () => void, opts: EvalOptions = {}): EvalResult {
	if (current !== null) throw new Error("runEval: nested runEval is not allowed");
	const ctx: EvalCtx = {
		roots: [],
		kept: [],
		clock: null,
		seed: opts.seed ?? DEFAULT_SEED,
		seedPinned: false,
		specs: new Map(),
		subpatches: new Map(),
		scope: null,
	};
	run(ctx, fn);
	return opts.slotSites === undefined ? ctx : { ...ctx, slotSites: opts.slotSites };
}

/**
 * Run a sub-patch's `patch` at compile, with the finished eval's module tables
 * and `scope` stamped on every node built. A sub-patch returns its outputs; it
 * has no settings and defines no modules, so those are loud errors here.
 */
export function runInScope<T>(base: EvalResult, scope: Scope, fn: () => T): T {
	if (current !== null) throw new Error("runInScope: a context is already live (internal error)");
	const ctx: EvalCtx = {
		roots: [],
		kept: [],
		clock: null,
		seed: base.seed,
		seedPinned: false,
		specs: new Map(base.specs),
		subpatches: new Map(base.subpatches),
		scope,
	};
	const result = run(ctx, fn);
	assertNoEffects(ctx, base, scope.module);
	return result;
}

function run<T>(ctx: EvalCtx, fn: () => T): T {
	current = ctx;
	try {
		return fn();
	} finally {
		current = null;
	}
}

function assertNoEffects(ctx: EvalCtx, base: EvalResult, name: string): void {
	const where = `sub-patch '${name}'`;
	if (ctx.roots.length > 0) {
		throw new Error(`${where}: out() inside patch. Return the outputs from patch instead.`);
	}
	if (ctx.kept.length > 0) {
		throw new Error(
			`${where}: a display module (e.g. scope()) inside patch. Call it outside patch, on the sub-patch's outputs.`,
		);
	}
	if (ctx.clock !== null || ctx.seedPinned) {
		throw new Error(`${where}: tempo() and seed() are patch settings. Set them outside patch.`);
	}
	if (ctx.specs.size !== base.specs.size || ctx.subpatches.size !== base.subpatches.size) {
		throw new Error(`${where}: defmod() inside patch. Define modules outside patch.`);
	}
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

/** The current eval's sub-patch table, or null outside runEval. */
export function currentSubpatches(): ReadonlyMap<string, SubpatchSpec> | null {
	return current?.subpatches ?? null;
}

/** The sub-patch instance being built right now, or null. */
export function currentScope(): Scope | null {
	return current?.scope ?? null;
}
