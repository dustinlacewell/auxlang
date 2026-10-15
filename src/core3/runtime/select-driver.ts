/**
 * Picks the engine's block driver. Codegen off → the interpreter.
 * Codegen on → the generated driver, unless the host forbids `new Function`
 * (a CSP without 'unsafe-eval' throws EvalError): then the interpreter, with a
 * loud log. Any other compile error is a generator bug and propagates.
 */

import { compileDriver } from "./codegen/compile-driver";
import type { Driver, DriverOptions, DriverPlan } from "./driver";
import { interpretBlock } from "./interpret-block";

export function selectDriver(
	plan: DriverPlan,
	options: DriverOptions,
	compile: (plan: DriverPlan, paste: boolean) => Driver = compileDriver,
): Driver {
	if (!(options.codegen ?? false)) return interpretBlock(plan);
	try {
		return compile(plan, options.paste ?? true);
	} catch (err) {
		if (!(err instanceof EvalError)) throw err;
		console.error(`[core3] codegen blocked, falling back to the interpreter: ${String(err)}`);
		return interpretBlock(plan);
	}
}
