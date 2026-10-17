/**
 * The realm's root-scope sub-patch table: what `defpatch` writes when
 * no eval is live. Kept apart from the module registry (module/define),
 * which the worklet bundle reads: a sub-patch never reaches the engine.
 */

import type { SubpatchSpec, SubpatchTable } from "./subpatch-spec";

const registry = new Map<string, SubpatchSpec>();

export function registerSubpatch(spec: SubpatchSpec): void {
	if (registry.has(spec.name)) throw new Error(`module '${spec.name}' already defined`);
	registry.set(spec.name, spec);
}

export function rootSubpatches(): SubpatchTable {
	return registry;
}
