/**
 * The user-facing patch surface. A program is a JS function passed to
 * `runEval`; inside it, module factories, `clock`, `loop`, `out`, and `p`
 * construct pure values, and `out()` marks roots. `compile` turns the collected
 * eval into a serializable `Program`.
 *
 * Module factories come from the shared registry by name (`factory("saw")`), so
 * this file never imports the module library — the modules register themselves
 * elsewhere (worklet bundle, tests define their own). `buildUserScope` is the
 * one place that reads the registry, so the page's eval scope and the headless
 * verifiers share a SINGLE, registry-driven source of names — no hand list to
 * drift.
 */

import { compile } from "./compile/compile";
import { getModule, getRegistry } from "./module/define";
import { clock } from "./patch/clock";
import { runEval } from "./patch/context";
import { moduleFactory } from "./patch/factory";
import type { Handle } from "./patch/handle-data";
import { loop } from "./patch/loop";
import { out } from "./patch/out";
import { patstep } from "./patch/patstep";
import { seq } from "./patch/seq";
import { p } from "./pattern/notation/template";
import type { Program } from "./types";

export { runEval } from "./patch/context";
export { clock } from "./patch/clock";
export { loop } from "./patch/loop";
export { out } from "./patch/out";
export { seq } from "./patch/seq";
export { patstep } from "./patch/patstep";
export { compile } from "./compile/compile";
export { p } from "./pattern/notation/template";
export type { EvalResult } from "./patch/context";
export type { Handle } from "./patch/handle-data";
export type { Program } from "./types";

/** The factory for a registered module: `factory("saw")(440)`. Loud if unknown. */
export function factory(name: string): (...args: unknown[]) => Handle {
	return moduleFactory(getModule(name));
}

/**
 * Reserved user-scope bindings that are NOT plain module factories. Two kinds:
 * special patch-builders that override a same-named module with richer
 * semantics (ambient-clock binding, root registration, pattern parsing), and
 * pure helpers with no module of the same name. `buildUserScope` layers these
 * over the generated factories; a future module colliding with a pure helper is
 * a loud error (see below).
 */
const RESERVED = { clock, seq, out, patstep, loop, p } as const;

/** Reserved names that intentionally override a same-named registered module. */
const MODULE_OVERRIDES = new Set(["clock", "seq", "out", "patstep"]);

/**
 * The complete user scope, generated from the registry: every registered module
 * as a named factory, then the reserved bindings layered on top. Callers must
 * have populated the registry first (import `@/core3/modules/all`).
 *
 * Resolution is eager here (the registry is required to be populated), but each
 * factory closes over `getModule(name)` lazily, matching the rest of the layer.
 */
export function buildUserScope(): Record<string, unknown> {
	const scope: Record<string, unknown> = {};
	for (const name of getRegistry().keys()) {
		if (MODULE_OVERRIDES.has(name)) continue; // provided by RESERVED below
		scope[name] = factory(name);
	}
	for (const [name, value] of Object.entries(RESERVED)) {
		if (!MODULE_OVERRIDES.has(name) && name in scope) {
			throw new Error(
				`user scope: reserved helper '${name}' collides with a registered module of the ` +
					`same name. Rename the module or promote it to a MODULE_OVERRIDES builder.`,
			);
		}
		scope[name] = value;
	}
	return scope;
}

/** Convenience: evaluate a patch function and compile it in one step. */
export function runProgram(fn: () => void, opts: { seed?: number } = {}): Program {
	return compile(runEval(fn, opts));
}
