/**
 * `defineInternalModule(spec)` — the backend's own entry point for an INTERNAL
 * spec (ins/outs, defaults, optional state/config/policy, tick + helpers as
 * closures), the same shape the old public object-form `defmod` dispatched
 * on. `defmod.ts`'s object branch calls this today (a later step deletes that
 * branch); the test fixture (tests/core3/fixtures/internal-module.ts) is the
 * other caller, reaching it from patch text. Not part of the patch language.
 *
 * `writes` is passed through as given — absent keeps today's hash-kind
 * carry behavior (compile/kind.ts), matching the object form this replaces.
 */

import { type WrittenSpec, bindModule } from "./bind-module";
import { type ReadTime } from "./front/module/check-module";
import { registerSpec, validateSpec } from "./define";
import type { ModuleSpec } from "../types";
import { currentSpecs, evalCtx } from "../patch/context";
import { assertNoReservedPorts } from "../patch/handle";
import { assertEvalNameFree, assertRootNameFree } from "../patch/name-free";

export function defineInternalModule(spec: WrittenSpec): ModuleSpec {
	return currentSpecs() === null ? registerRootSpec(spec) : registerEvalSpec(spec);
}

/** Root-scope write (the library, at import): contract checks, the tick build, the realm registry; the tick is read on first use. */
function registerRootSpec(written: WrittenSpec): ModuleSpec {
	validateSpec(written);
	return registerRoot(written.name, (read) => bindModule(written, read));
}

/** Eval-scope write: full collision surface (registry, scope helpers, handle names, this eval), then the eval's table. */
function registerEvalSpec(written: WrittenSpec): ModuleSpec {
	validateSpec(written);
	assertNoReservedPorts(written);
	assertJsonConfig(written.name, written.config);
	return registerEval(written.name, (read) => bindModule(written, read));
}

/** Root-scope write, shared by both `defmod` forms: contract checks on the name, bind, the realm registry. */
function registerRoot(name: string, bind: (read: ReadTime) => ModuleSpec): ModuleSpec {
	assertRootNameFree(name);
	const bound = bind("first use");
	validateSpec(bound);
	registerSpec(bound);
	return bound;
}

/** Eval-scope write, shared by both `defmod` forms: the full collision surface, bind, then this eval's table. */
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
