/**
 * clip - Clip/clamp signal to range
 *
 * Inputs:
 *   input: signal (default: 0) - input signal
 *   min: number (default: -1) - minimum value
 *   max: number (default: 1) - maximum value
 *
 * Outputs:
 *   val: clipped signal
 */

import type { TestDefinition } from "../types";

export const clipDefault: TestDefinition = {
	id: "clip-default",
	category: "Math",
	name: "clip - defaults",
	desc: "Hard clip signal",
	code: `sin(110).mult(2).clip().out()`,
};

export const clipAllParams: TestDefinition = {
	id: "clip-all-params",
	category: "Math",
	name: "clip - all params",
	desc: "Asymmetric clipping",
	code: `sin(110).mult(2).clip({ min: -0.5, max: 1 }).out()`,
};

export const clipModMin: TestDefinition = {
	id: "clip-mod-min",
	category: "Math",
	name: "clip - modulated min",
	desc: "Varying clip floor",
	code: `sin(110).mult(2).clip({ min: sin(0.5, -1, 0), max: 1 }).out()`,
};

export const clipModMax: TestDefinition = {
	id: "clip-mod-max",
	category: "Math",
	name: "clip - modulated max",
	desc: "Varying clip ceiling",
	code: `sin(110).mult(2).clip({ min: -1, max: sin(0.5, 0.3, 1) }).out()`,
};

export const clipShowcase: TestDefinition = {
	id: "clip-showcase",
	category: "Math",
	name: "clip - showcase",
	desc: "Soft-to-hard distortion",
	code: `clock(120).seq("c2 c2 eb2 g2").apply(s =>
  s.cv.saw()
    .mult(sin(0.25, 1, 4))
    .clip({ min: -0.8, max: 0.8 })
    .lpf({ cutoff: 500 })
    .gain({ level: s.gate.adsr() })
    .out()
)`,
};

export const clipTests = [clipDefault, clipAllParams, clipModMin, clipModMax, clipShowcase];
