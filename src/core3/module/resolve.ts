/**
 * Layered module resolution: the bundled registry plus an optional table of
 * patch-defined specs (defmod). Bundled names are checked first — defmod
 * refuses to shadow them, so the order is really just "check both". Used by
 * the patch layer (with the live eval's table) and by compile (with the
 * EvalResult's table, since compile runs after the eval context is gone).
 */

import type { ModuleSpec } from "../types";
import { getModule, getRegistry, hasModule } from "./define";

export type SpecTable = ReadonlyMap<string, ModuleSpec>;

export function hasSpec(name: string, extra?: SpecTable | null): boolean {
	return hasModule(name) || (extra?.has(name) ?? false);
}

export function resolveSpec(name: string, extra?: SpecTable | null): ModuleSpec {
	if (hasModule(name)) return getModule(name);
	const spec = extra?.get(name);
	if (spec !== undefined) return spec;
	const defined =
		extra && extra.size > 0 ? ` Patch-defined: [${[...extra.keys()].join(", ")}]` : "";
	throw new Error(
		`unknown module '${name}'. Known: [${[...getRegistry().keys()].join(", ")}].${defined}`,
	);
}
