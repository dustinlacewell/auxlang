/**
 * Stage B for one node lane: the module's tick planned for the lane's
 * instance (tick-instance.ts) and checked, the same plan for every engine.
 * Every engine specialises every node at build, so a form only one config,
 * input binding or sample rate reaches fails loudly on all of them alike.
 * Memoised on (module, instance key): lanes and nodes that agree share one
 * plan, and so does a second engine built from the same module reading.
 */

import type { ModuleIR } from "@/core3/module/front/module/module-ir";
import { judgeKinds } from "@/core3/module/front/kinds/check-kinds";
import { calleesOf } from "./callees";
import { type FunctionPlan, tickPlan } from "./function-plan";
import { type TickInstance, instanceKey } from "./tick-instance";
import { instanceRoot } from "./tick-root";

const plans = new WeakMap<ModuleIR, Map<string, FunctionPlan>>();

export function specialise(ir: ModuleIR, instance: TickInstance): FunctionPlan {
	let byKey = plans.get(ir);
	if (byKey === undefined) {
		byKey = new Map();
		plans.set(ir, byKey);
	}
	const key = instanceKey(instance);
	const known = byKey.get(key);
	if (known !== undefined) return known;
	const plan = tickPlan(ir.tick, instanceRoot(instance), calleesOf(ir.helpers));
	judgeKinds(plan);
	byKey.set(key, plan);
	return plan;
}
