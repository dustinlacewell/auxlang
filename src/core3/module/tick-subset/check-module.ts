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
import type { ModuleSource, ModuleSpec } from "@/core3/types";
import { checkStateValues } from "./check-state";
import { checkModuleKinds } from "./kinds/check-kinds";

/** The rate used to build a sample fresh state; shapes do not depend on it. */
const SHAPE_SAMPLE_RATE = 48000;

export function checkModule(spec: ModuleSpec, source: ModuleSource): ModuleIR {
	const owner = `defmod('${spec.name}')`;
	const own = spec.state?.(SHAPE_SAMPLE_RATE) ?? {};
	checkStateValues(own, owner);
	const state = tickState(own);
	const ir = analyseModule(source, {
		owner,
		ins: new Set(Object.keys(spec.ins)),
		outs: new Set(Object.keys(spec.outs)),
		state,
		tables: spec.reads === "pattern",
	});
	checkModuleKinds({ tick: ir.tick, helpers: ir.helpers, state, config: spec.config ?? {} });
	return ir;
}

/**
 * The state a tick sees: the module's own fresh state plus the fields the
 * engine injects into every lane (runtime/fresh-node-states.ts).
 */
function tickState(own: Record<string, unknown>): Record<string, unknown> {
	return { ...own, __rng: 1, __lane: 0, __seed: 0 };
}
