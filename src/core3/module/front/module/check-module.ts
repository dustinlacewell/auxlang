/**
 * The tick subset check for one bound module (MANIFESTO §5.1), at `defmod`
 * for every module, built-in and patch-defined: the module's real fresh
 * state must hold typed arrays and numbers (front/state/check-state.ts),
 * and its bound tick and helpers are read once against its real ports and
 * that state (analyse-module.ts), the result kept with the spec
 * (kept-ir.ts). A patch module is read `now`, so its errors are the patch's
 * at eval; a library module on its `first use` (spec-ir.ts), so importing
 * the library reads no tick. Booleans kept as numbers are checked per node
 * at build, for the node's own config and inputs (front/types/specialise.ts).
 */

import type { ModuleSource, ModuleSpec } from "@/core3/types";
import { checkStateValues } from "@/core3/module/front/state/check-state";
import { analyseModule } from "./analyse-module";
import { keepIR } from "./kept-ir";
import { moduleFacts } from "./module-facts";

export type ReadTime = "now" | "first use";

export function checkModule(spec: ModuleSpec, source: ModuleSource, when: ReadTime): void {
	const facts = moduleFacts(spec, `defmod('${spec.name}')`);
	checkStateValues(facts.state, facts.owner);
	if (when === "now") keepIR(spec, analyseModule(source, facts));
}
