/**
 * Module registry — the realm's root-scope module table. `registerSpec` is the
 * root-scope write; the ONE public registration function is `defmod`
 * (patch/defmod), which dispatches here when no eval is live and into the
 * eval's own table otherwise. The registry is imported directly by BOTH the
 * main thread (API layer) and the worklet bundle — root-scope module code is
 * never stringified. (Eval-defined modules are the one exception: they cross
 * by value as source strings inside the Program and are layered over this
 * registry per engine — see runtime/hydrate-specs. The registry itself is
 * never written by them.)
 */

import type { ModuleSpec } from "../types";

const registry = new Map<string, ModuleSpec>();

/** Contract checks shared by both defmod scopes: defaults and positionals must name real ports. */
export function validateSpec(spec: ModuleSpec): void {
	if (!(spec.defaultIn in spec.ins)) {
		throw new Error(`module '${spec.name}': defaultIn '${spec.defaultIn}' is not an input`);
	}
	if (!(spec.defaultOut in spec.outs)) {
		throw new Error(`module '${spec.name}': defaultOut '${spec.defaultOut}' is not an output`);
	}
	for (const p of spec.positional ?? []) {
		if (!(p in spec.ins) && !(p in (spec.config ?? {}))) {
			throw new Error(`module '${spec.name}': positional '${p}' is neither input nor config`);
		}
	}
}

/** Root-scope write: validate and register into the realm registry. Duplicate name is a loud error. */
export function registerSpec(spec: ModuleSpec): void {
	if (registry.has(spec.name)) throw new Error(`module '${spec.name}' already defined`);
	validateSpec(spec);
	registry.set(spec.name, spec);
}

export function getModule(name: string): ModuleSpec {
	const spec = registry.get(name);
	if (!spec) {
		throw new Error(`unknown module '${name}'. Known: [${[...registry.keys()].join(", ")}]`);
	}
	return spec;
}

export function hasModule(name: string): boolean {
	return registry.has(name);
}

export function getRegistry(): ReadonlyMap<string, ModuleSpec> {
	return registry;
}
