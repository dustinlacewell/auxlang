/**
 * Picks the engine's per-sample driver. Codegen off → the interpreter.
 * Codegen on → the generated driver, unless the host forbids `new Function`
 * (a CSP without 'unsafe-eval' throws EvalError): then the interpreter, with a
 * loud log. Any other compile error is a generator bug and propagates.
 */

import { compileDriver } from "./codegen/compile-driver";
import type { Driver } from "./driver";
import { interpretSample } from "./interpret-sample";
import type { NodeRun } from "./node-run";

export function selectDriver(
	runs: readonly NodeRun[],
	codegen: boolean,
	compile: (runs: readonly NodeRun[]) => Driver = compileDriver,
): Driver {
	if (!codegen) return interpretSample(runs);
	try {
		return compile(runs);
	} catch (err) {
		if (!(err instanceof EvalError)) throw err;
		console.error(`[core3] codegen blocked, falling back to the interpreter: ${String(err)}`);
		return interpretSample(runs);
	}
}
