/**
 * Phase-1 codegen driver: one generated block function per program, over the
 * SAME built runs the interpreter walks (states, ins/outs records, bindings,
 * gathers), so the two drivers share one source of semantics. Every node
 * keeps a static call site per lane (emit-call-node.ts); node outputs live in
 * slot locals for the whole block (value-slots.ts). The pasted form is
 * compile-grouped.ts. Only numbers, JSON-quoted keys and generated names
 * reach the source; every object is passed in through the driver's scope.
 */

import type { Driver, DriverPlan } from "../driver";
import { DriverScope } from "./driver-scope";
import { emitBlockLoop } from "./emit-block-loop";
import { emitCallNode } from "./emit-call-node";
import { emitTapSums } from "./emit-tap-sums";
import { LOCAL_SLOTS } from "./slot-access";
import { valueSlots } from "./value-slots";

export function compileDriver(plan: DriverPlan): Driver {
	const scope = new DriverScope();
	const nodes = plan.runs.map((run, i) => emitCallNode(run, i, scope, LOCAL_SLOTS));
	const body = emitBlockLoop(valueSlots(plan.runs), nodes, emitTapSums(plan.tapsL, plan.tapsR));
	return scope.instantiate({ shared: "", prelude: "", body: body.join("\n") });
}
