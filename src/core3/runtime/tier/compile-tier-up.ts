/**
 * The tier-up driver for a plan: phase 1 (codegen/compile-driver), phase 2
 * (codegen/compile-grouped) and phase 2's shadow twin, composed by
 * tier-driver.ts.
 */

import { compileDriver } from "../codegen/compile-driver";
import { compileGroupedTwins } from "../codegen/compile-grouped";
import { GROUP_BUDGET } from "../codegen/group/group-budget";
import type { Driver, DriverOptions, DriverPlan } from "../driver";
import { shadowCloner } from "./shadow-clone";
import { TIER_CONFIG } from "./tier-config";
import { tierDriver } from "./tier-driver";

export function compileTierUp(plan: DriverPlan, options: DriverOptions): Driver {
	const phase2 = compileGroupedTwins(plan, options.groupBudget ?? GROUP_BUDGET, shadowCloner());
	return tierDriver(
		{ phase1: compileDriver(plan), phase2: phase2.real, shadow: phase2.shadow },
		options.tier ?? TIER_CONFIG,
	);
}
