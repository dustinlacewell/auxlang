/**
 * The user-facing patch surface. A program is a JS function passed to
 * `runEval`; inside it, module factories, `clock`, `loop`, `out`, and `p`
 * construct pure values, and `out()` marks roots. `compile` turns the collected
 * eval into a serializable `Program`.
 *
 * Module factories come from the shared registry by name (`mod("saw")`), so
 * this file never imports the module library — the modules register themselves
 * elsewhere (worklet bundle, tests define their own).
 */

import { compile } from "./compile/compile";
import { getModule } from "./module/define";
import { runEval } from "./patch/context";
import { moduleFactory } from "./patch/factory";
import type { Handle } from "./patch/handle-data";
import type { Program } from "./types";

export { runEval } from "./patch/context";
export { clock } from "./patch/clock";
export { loop } from "./patch/loop";
export { out } from "./patch/out";
export { compile } from "./compile/compile";
export { p } from "./pattern/notation/template";
export type { EvalResult } from "./patch/context";
export type { Handle } from "./patch/handle-data";
export type { Program } from "./types";

/** The factory for a registered module: `mod("saw")(440)`. Loud if unknown. */
export function mod(name: string): (...args: unknown[]) => Handle {
	return moduleFactory(getModule(name));
}

/** Convenience: evaluate a patch function and compile it in one step. */
export function runProgram(fn: () => void, opts: { seed?: number } = {}): Program {
	return compile(runEval(fn, opts));
}
