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
export { seq } from "./patch/seq";
export { patstep } from "./patch/patstep";
export { compile } from "./compile/compile";
export { p } from "./pattern/notation/template";
export type { EvalResult } from "./patch/context";
export type { Handle } from "./patch/handle-data";
export type { Program } from "./types";

/** The factory for a registered module: `mod("saw")(440)`. Loud if unknown. */
export function mod(name: string): (...args: unknown[]) => Handle {
	return moduleFactory(getModule(name));
}

/**
 * Named factories for the module library. Resolution is LAZY (at call time),
 * preserving this file's law: it never imports the module library — the
 * registry is populated by importing `modules/all` (worklet bundle, tests).
 */
const factory =
	(name: string) =>
	(...args: unknown[]): Handle =>
		moduleFactory(getModule(name))(...args);

// sources
export const osc = factory("osc");
export const sin = factory("sin");
export const saw = factory("saw");
export const tri = factory("tri");
export const sqr = factory("sqr");
export const noise = factory("noise");
// filters
export const lpf = factory("lpf");
export const hpf = factory("hpf");
export const bpf = factory("bpf");
export const notch = factory("notch");
// envelopes
export const ad = factory("ad");
export const ar = factory("ar");
export const adsr = factory("adsr");
// math & utility
export const mul = factory("mul");
export const vca = factory("vca");
export const gain = factory("gain");
export const add = factory("add");
export const sub = factory("sub");
export const div = factory("div");
export const gt = factory("gt");
export const lt = factory("lt");
export const eq = factory("eq");
export const clip = factory("clip");
export const abs = factory("abs");
export const scale = factory("scale");
export const slew = factory("slew");
export const sah = factory("sah");
export const quantize = factory("quantize");
// space & mixing
export const pan = factory("pan");
export const mix = factory("mix");
export const delay = factory("delay");
// drums
export const kick = factory("kick");
export const snare = factory("snare");
export const hihat = factory("hihat");
export const clap = factory("clap");

/** Convenience: evaluate a patch function and compile it in one step. */
export function runProgram(fn: () => void, opts: { seed?: number } = {}): Program {
	return compile(runEval(fn, opts));
}
