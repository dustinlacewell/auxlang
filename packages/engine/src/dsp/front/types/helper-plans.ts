/**
 * Helper plans, one per helper and argument types, shared by every caller
 * and engine. A helper reached again while it is being planned (a cycle,
 * which the rules reject) has no plan.
 */

import type { FunctionIR } from "../module/module-ir";
import type { Callee } from "./callees";
import { type FunctionPlan, planFunction } from "./function-plan";
import { type Ty, tyKey } from "./ty";

const plans = new WeakMap<FunctionIR, Map<string, FunctionPlan | null>>();

export function helperPlan(callee: Callee, params: readonly Ty[]): FunctionPlan | null {
	let byKey = plans.get(callee.ir);
	if (byKey === undefined) {
		byKey = new Map();
		plans.set(callee.ir, byKey);
	}
	const key = params.map(tyKey).join(",");
	const known = byKey.get(key);
	if (known !== undefined) return known;
	byKey.set(key, null);
	const plan = planFunction(callee.ir, params, null, callee.callees);
	byKey.set(key, plan);
	return plan;
}
