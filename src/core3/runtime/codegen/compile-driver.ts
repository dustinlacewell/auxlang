/**
 * Codegen driver: one generated block function per program, over the SAME
 * built runs the interpreter walks (states, ins/outs records, bindings,
 * gathers), so the two drivers share one source of semantics. Node outputs
 * live in slot locals for the whole block (value-slots.ts). Each node either
 * has its tick pasted inline, with its state in locals (paste/), or keeps a
 * static call site per lane (emit-call-node.ts). Nodes paste in order while
 * the driver's estimated size fits the budget (paste-budget.ts), so the
 * driver stays small enough for V8 to optimize. Only numbers, JSON-quoted
 * keys and generated names reach the source; every object is passed in
 * through the driver's scope.
 */

import type { Driver, DriverPlan } from "../driver";
import { DriverScope } from "./driver-scope";
import { emitBlockLoop } from "./emit-block-loop";
import { emitCallNode } from "./emit-call-node";
import { emitTapSums } from "./emit-tap-sums";
import { choosePasted } from "./paste/choose-pasted";
import { nodeCost } from "./paste/node-cost";
import { ParseCache } from "./paste/parse-cache";
import { PASTE_BUDGET } from "./paste/paste-budget";
import { Paster } from "./paste/paster";
import { valueSlots } from "./value-slots";

export function compileDriver(plan: DriverPlan, budget = PASTE_BUDGET): Driver {
	const scope = new DriverScope();
	const trees = new ParseCache();
	const chosen = choosePasted(
		plan.runs.map((run) => nodeCost(run, trees)),
		budget,
	);
	const paster = new Paster(plan.runs, scope, trees);
	const nodes = plan.runs.map(
		(run, i) => (chosen.has(i) ? paster.paste(run, i) : null) ?? emitCallNode(run, i, scope),
	);
	const body = emitBlockLoop(valueSlots(plan), nodes, emitTapSums(plan.tapsL, plan.tapsR));
	return scope.instantiate(paster.preludeSource(), body.join("\n"));
}
