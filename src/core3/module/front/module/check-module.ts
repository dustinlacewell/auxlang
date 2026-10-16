/**
 * The tick subset check for one module (MANIFESTO §5.1), run at eval for
 * every module, built-in and patch-defined: the module's real fresh state
 * must hold typed arrays and numbers (front/state/check-state.ts); the tick and
 * helpers are read once against its real ports and that state
 * (analyse-module.ts). Booleans kept as numbers are checked per
 * node at build, for the node's own config and inputs
 * (front/types/specialise.ts).
 */

import { analyseModule } from "@/core3/module/front/module/analyse-module";
import type { ModuleIR } from "@/core3/module/front/module/module-ir";
import { moduleFacts } from "@/core3/module/front/module/module-facts";
import type { ModuleSource, ModuleSpec } from "@/core3/types";
import { checkStateValues } from "@/core3/module/front/state/check-state";

export function checkModule(spec: ModuleSpec, source: ModuleSource): ModuleIR {
	const facts = moduleFacts(spec, `defmod('${spec.name}')`);
	checkStateValues(facts.state, facts.owner);
	return analyseModule(source, facts);
}
