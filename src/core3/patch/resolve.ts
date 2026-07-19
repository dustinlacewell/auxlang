/**
 * Eval-aware module resolution for the patch layer: the bundled registry
 * layered with the CURRENT eval's defmod table. Outside runEval the table is
 * simply absent, so bundled lookups still work (handles probed outside eval
 * must not explode on bundled modules).
 */

import { hasSpec, resolveSpec } from "../module/resolve";
import type { ModuleSpec } from "../types";
import { currentSpecs } from "./context";

export function resolvePatchModule(name: string): ModuleSpec {
	return resolveSpec(name, currentSpecs());
}

export function isPatchModule(name: string): boolean {
	return hasSpec(name, currentSpecs());
}
