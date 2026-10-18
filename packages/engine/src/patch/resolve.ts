/**
 * Eval-aware module resolution for the patch layer: the bundled registry
 * layered with the CURRENT eval's defmod table, plus the sub-patch modules
 * (root and eval). The patch layer needs only a module's ports, so a tick
 * module and a sub-patch resolve alike. Outside runEval the eval tables are
 * simply absent, so bundled lookups still work (handles probed outside eval
 * must not explode on bundled modules).
 */

import { hasSpec, resolveSpec } from "../dsp/resolve";
import type { ModulePorts } from "../types";
import { currentSpecs, currentSubpatches } from "./context";
import { findSubpatch } from "./subpatch/find-subpatch";

export function resolvePatchModule(name: string): ModulePorts {
	return findSubpatch(name, currentSubpatches()) ?? resolveSpec(name, currentSpecs());
}

export function isPatchModule(name: string): boolean {
	return hasSpec(name, currentSpecs()) || findSubpatch(name, currentSubpatches()) !== undefined;
}
