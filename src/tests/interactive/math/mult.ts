/**
 * mult - Multiply two signals
 *
 * Inputs:
 *   input: signal (default: 0) - first signal
 *   by: signal (default: 1) - multiplier
 *
 * Outputs:
 *   val: product
 */

import type { TestDefinition } from "../types";

export const multDefault: TestDefinition = {
	id: "mult-default",
	category: "Math",
	name: "mult - defaults",
	desc: "Scale frequency by constant",
	code: `saw(mult(220).by(2)).out()`,
};

export const multAllParams: TestDefinition = {
	id: "mult-all-params",
	category: "Math",
	name: "mult - all params",
	desc: "Ring modulation",
	code: `sin(220).mult(sin(221)).out()`,
};

export const multModBy: TestDefinition = {
	id: "mult-mod-by",
	category: "Math",
	name: "mult - modulated by",
	desc: "Tremolo with mult",
	code: `saw(220).mult(lfo(4, 0.5, 1)).out()`,
};

export const multShowcase: TestDefinition = {
	id: "mult-showcase",
	category: "Math",
	name: "mult - showcase",
	desc: "Classic ring modulation",
	code: `clock(120).seq("c3 e3 g3 c4").apply(s =>
  s.cv.saw().mult(sin(200)).lpf({ cutoff: 2000 }).gain({ level: s.gate.adsr() }).out()
)`,
};

export const multTests = [multDefault, multAllParams, multModBy, multShowcase];
