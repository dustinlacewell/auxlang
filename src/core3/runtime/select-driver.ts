/**
 * Picks the engine's block driver. Codegen off → the interpreter.
 * Codegen on → a generated driver (phase 1, phase 2 with `paste`, or phase 1
 * tiering up to phase 2 with `tierUp`), unless
 * the host forbids `new Function` (a CSP without 'unsafe-eval' throws
 * EvalError): then the interpreter, with a loud log. Any other compile error
 * is a generator bug and propagates.
 */

import { compileDriver } from "./codegen/compile-driver";
import { compileGrouped } from "./codegen/compile-grouped";
import type { Driver, DriverOptions, DriverPlan } from "./driver";
import { interpretBlock } from "./interpret-block";
import { compileTierUp } from "./tier/compile-tier-up";

export function selectDriver(
	plan: DriverPlan,
	options: DriverOptions,
	compile: (plan: DriverPlan, options: DriverOptions) => Driver = compileGenerated,
): Driver {
	if (!(options.codegen ?? false)) return interpretBlock(plan);
	try {
		return compile(plan, options);
	} catch (err) {
		if (!(err instanceof EvalError)) throw err;
		console.error(`[core3] codegen blocked, falling back to the interpreter: ${String(err)}`);
		return interpretBlock(plan);
	}
}

function compileGenerated(plan: DriverPlan, options: DriverOptions): Driver {
	if (options.tierUp === true) return compileTierUp(plan, options);
	return options.paste === true ? compileGrouped(plan, options.groupBudget) : compileDriver(plan);
}
