/**
 * The front end's result for a spec, kept with the spec by identity: `defmod`
 * keeps what it checked (bind-module.ts), and a spec rebuilt from its
 * serialized form on the main thread keeps its source spec's (serialize.ts).
 * Holds no reader, so the worklet's hydrate imports no front end.
 */

import type { ModuleSpec } from "../../../types";
import type { ModuleIR } from "./module-ir";

const kept = new WeakMap<ModuleSpec, ModuleIR>();

/** Keep `ir`, read from `spec.source`, with `spec`. */
export function keepIR(spec: ModuleSpec, ir: ModuleIR): void {
	kept.set(spec, ir);
}

/** The IR kept with `spec`, if any. */
export function keptIR(spec: ModuleSpec): ModuleIR | undefined {
	return kept.get(spec);
}
