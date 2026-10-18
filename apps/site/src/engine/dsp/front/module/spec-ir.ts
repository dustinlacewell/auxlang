/**
 * A spec's bound tick and helpers as the front end read them: what every
 * engine specialises at build (front/types/specialise.ts) and the WASM
 * compiler emits from. A patch module was read at `defmod`
 * (check-module.ts) and build takes the kept result (kept-ir.ts). A library
 * module, or a spec that crossed by a copy (a structured clone, JSON) and
 * lost its IR, is read here on first use, once, on the main thread. The
 * worklet never asks.
 */

import type { ModuleSpec } from "@/engine/types";
import { keepIR, keptIR } from "./kept-ir";
import { moduleFacts } from "./module-facts";
import type { ModuleIR } from "./module-ir";
import { readModule } from "./read-module";

export function specIR(spec: ModuleSpec): ModuleIR {
	const known = keptIR(spec);
	if (known !== undefined) return known;
	if (spec.source === undefined) throw new Error(`module '${spec.name}' has no tick source`);	const ir = readModule(spec, spec.source, moduleFacts(spec, `defmod('${spec.name}')`));
	keepIR(spec, ir);
	return ir;
}
