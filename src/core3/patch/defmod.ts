/**
 * `defmod(name, meta?, setup)` — THE module registration function, scope-aware
 * (shape C, MANIFESTO §5.1), lowered through `src/core3/module/lower/`:
 *
 *   root scope (no eval live)  → the realm registry, the bundle's module table
 *   eval scope (inside runEval) → the current eval's table, scoped to that
 *                                 one patch; nothing leaks between evals
 *
 * The setup function is read back as source text (`setup.toString()`),
 * lowered into ins/outs/state/tick, and bound the same way every module is
 * (module/bind-module `bindSource`). Eval-defined specs ship to the worklet
 * as source strings; their `state` is fenced at that crossing (compile).
 *
 * Returns the module's factory, so standalone/source-style use works too:
 * `const mysaw = defmod("mysaw", ({ sr }) => (ins) => ...); mysaw(220).out()`.
 *
 * `defpatch` (patch/defpatch.ts) is the sub-patch equivalent: a module whose
 * body is a patch graph instead of a tick.
 */

import { type ReadTime } from "../module/front/module/check-module";
import { registerSpec, validateSpec } from "../module/define";
import type { ModuleSpec } from "../types";
import { currentSpecs, evalCtx } from "./context";
import { defineModule } from "./define-module";
import { moduleFactory } from "./factory";
import { assertNoReservedPorts } from "./handle";
import type { Handle } from "./handle-data";
import { assertEvalNameFree, assertRootNameFree } from "./name-free";

export function defmod(name: string, setup: (...args: never[]) => unknown): (...args: unknown[]) => Handle;
export function defmod(
	name: string,
	meta: Record<string, unknown>,
	setup: (...args: never[]) => unknown,
): (...args: unknown[]) => Handle;
export function defmod(
	name: unknown,
	metaOrSetup: unknown,
	maybeSetup?: unknown,
): (...args: unknown[]) => Handle {
	if (typeof name !== "string") {
		throw new Error(
			`defmod(spec): the first argument must be a module name, e.g. defmod("name", ({ sr }) => (ins) => ...). ` +
				`For a sub-patch, use defpatch("name", (ins) => ...).`,
		);
	}
	const [meta, setup] =
		maybeSetup === undefined ? [{}, metaOrSetup] : [metaOrSetup as Record<string, unknown>, maybeSetup];
	return moduleFactory(register(name, meta, setup as (...args: never[]) => unknown));
}

/** Lower, compile its state text, and bind the result into a ModuleSpec (module/define-module). */
function register(
	name: string,
	meta: Record<string, unknown>,
	setup: (...args: never[]) => unknown,
): ModuleSpec {
	return currentSpecs() === null
		? registerRoot(name, (read) => defineModule(name, meta, setup, read))
		: registerEval(name, (read) => defineModule(name, meta, setup, read));
}

/** Root-scope write: contract checks on the name, bind, the realm registry. */
function registerRoot(name: string, bind: (read: ReadTime) => ModuleSpec): ModuleSpec {
	assertRootNameFree(name);
	const bound = bind("first use");
	validateSpec(bound);
	registerSpec(bound);
	return bound;
}

/** Eval-scope write: the full collision surface, bind, then this eval's table. */
function registerEval(name: string, bind: (read: ReadTime) => ModuleSpec): ModuleSpec {
	const ctx = evalCtx("defmod()");
	assertEvalNameFree(name);
	const bound = bind("now");
	validateSpec(bound);
	assertNoReservedPorts(bound);
	assertJsonConfig(bound.name, bound.config);
	ctx.specs.set(bound.name, bound);
	return bound;
}

/** Config ships inside the Program as JSON — anything else must fail here, loudly. */
function assertJsonConfig(name: string, config: Record<string, unknown> | undefined): void {
	if (config === undefined) return;
	for (const [key, value] of Object.entries(config)) {
		assertJsonValue(name, `config.${key}`, value);
	}
}

function assertJsonValue(name: string, path: string, value: unknown): void {
	if (value === null || typeof value === "string" || typeof value === "boolean") return;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error(`defmod('${name}'): ${path} is ${value} — config must be JSON-serializable`);
		}
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((v, i) => assertJsonValue(name, `${path}[${i}]`, v));
		return;
	}
	if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			assertJsonValue(name, `${path}.${k}`, v);
		}
		return;
	}
	throw new Error(
		`defmod('${name}'): ${path} is ${typeof value} — config must be JSON-serializable (numbers, strings, booleans, null, arrays, plain objects)`,
	);
}
