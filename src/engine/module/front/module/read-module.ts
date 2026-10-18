/**
 * Read one bound module (analyse-module.ts), then check the keys its tick
 * hashes as numbers against its declared config (bind-random/config-key.ts),
 * through the bindings the read resolved.
 */

import { assertConfigKeys } from "@/engine/module/bind-random/config-key";
import type { ModuleSource, ModuleSpec } from "@/engine/types";
import { analyseModule } from "./analyse-module";
import type { ModuleFacts, ModuleIR } from "./module-ir";

export function readModule(spec: ModuleSpec, source: ModuleSource, facts: ModuleFacts): ModuleIR {
	const ir = analyseModule(source, facts);
	assertConfigKeys(ir.tick, spec.config ?? {}, `${facts.owner} tick`);
	return ir;
}
