/**
 * A spec's bound tick and helpers (types.ts `ModuleSpec.source`), read once
 * per spec and kept with it: what the WASM compiler emits from. Read on first
 * use, not when the spec is built, so the worklet's spec hydrate does no
 * extra work.
 */

import type { ModuleSpec } from "@/core3/types";
import { analyseModule } from "./analyse-module";
import { moduleFacts } from "./module-facts";
import type { ModuleIR } from "./module-ir";

const read = new WeakMap<ModuleSpec, ModuleIR>();

export function specIR(spec: ModuleSpec): ModuleIR {
	const known = read.get(spec);
	if (known !== undefined) return known;
	if (spec.source === undefined) throw new Error(`module '${spec.name}' has no tick source`);
	const ir = analyseModule(spec.source, moduleFacts(spec, `module '${spec.name}'`));
	read.set(spec, ir);
	return ir;
}
