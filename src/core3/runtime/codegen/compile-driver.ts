/**
 * Codegen driver: one generated block function per program, over the SAME
 * built runs the interpreter walks (states, ins/outs records, bindings,
 * gathers), so the two drivers share one source of semantics. Node outputs
 * live in slot locals for the whole block (value-slots.ts). Each node either
 * has its tick pasted inline, with its state in locals (paste/), or keeps a
 * static call site per lane (emit-call-node.ts). Only numbers, JSON-quoted
 * keys and generated names reach the source; every object is passed in
 * through the driver's scope.
 */

import type { Driver, DriverPlan } from "../driver";
import { DriverScope } from "./driver-scope";
import { emitBlockLoop } from "./emit-block-loop";
import { emitCallNode } from "./emit-call-node";
import { emitTapSums } from "./emit-tap-sums";
import { Paster } from "./paste/paster";
import { valueSlots } from "./value-slots";

export function compileDriver(plan: DriverPlan, paste = true): Driver {
	const scope = new DriverScope();
	const paster = new Paster(plan.runs, scope);
	const nodes = plan.runs.map(
		(run, i) => (paste ? paster.paste(run, i) : null) ?? emitCallNode(run, i, scope),
	);
	const body = emitBlockLoop(valueSlots(plan), nodes, emitTapSums(plan.tapsL, plan.tapsR));
	return scope.instantiate(paster.preludeSource(), body.join("\n"));
}
