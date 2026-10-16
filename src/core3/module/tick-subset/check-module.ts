/**
 * The tick subset check for one module (MANIFESTO §5.1), run at eval for
 * every module, built-in and patch-defined: the module's real fresh state
 * must hold typed arrays and numbers (check-state.ts); the tick and helpers
 * are read once against its real ports and that state
 * (front/module/analyse-module.ts); then the whole is checked for booleans
 * kept as numbers (kinds/check-kinds.ts).
 */

import { analyseModule } from "@/core3/module/front/module/analyse-module";
import type { ModuleIR } from "@/core3/module/front/module/module-ir";
import { moduleFacts } from "@/core3/module/front/module/module-facts";
import type { ModuleSource, ModuleSpec } from "@/core3/types";
import { checkStateValues } from "./check-state";
import { checkModuleKinds } from "./kinds/check-kinds";

export function checkModule(spec: ModuleSpec, source: ModuleSource): ModuleIR {
	const facts = moduleFacts(spec, `defmod('${spec.name}')`);
	checkStateValues(facts.state, facts.owner);
	const ir = analyseModule(source, facts);
	checkModuleKinds({
		tick: ir.tick,
		helpers: ir.helpers,
		state: facts.state,
		config: spec.config ?? {},
	});
	return ir;
}
