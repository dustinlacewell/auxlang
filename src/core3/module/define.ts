/**
 * Module registry. `defineModule` validates a spec and registers it.
 * The registry is imported directly by BOTH the main thread (API layer)
 * and the worklet bundle — module code is never stringified.
 */

import type { ModuleSpec } from "../types";

const registry = new Map<string, ModuleSpec>();

export function defineModule(spec: ModuleSpec): ModuleSpec {
	if (registry.has(spec.name)) throw new Error(`module '${spec.name}' already defined`);
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
	registry.set(spec.name, spec);
	return spec;
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
