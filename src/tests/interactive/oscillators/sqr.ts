/**
 * sqr - Square oscillator
 *
 * Inputs:
 *   freq: number (default: 440) - oscillator frequency
 *   min: number (default: -1) - output minimum
 *   max: number (default: 1) - output maximum
 *
 * Outputs:
 *   audio: square wave
 */

import type { TestDefinition } from "../types";

export const sqrDefault: TestDefinition = {
	id: "sqr-default",
	category: "Oscillators",
	name: "sqr - defaults",
	desc: "Square wave at 440Hz",
	code: `sqr().out()`,
};

export const sqrAllParams: TestDefinition = {
	id: "sqr-all-params",
	category: "Oscillators",
	name: "sqr - all params",
	desc: "Square at 110Hz with reduced range",
	code: `sqr({ freq: 110, min: -0.3, max: 0.3 }).out()`,
};

export const sqrModFreq: TestDefinition = {
	id: "sqr-mod-freq",
	category: "Oscillators",
	name: "sqr - modulated freq",
	desc: "Square with LFO-modulated frequency",
	code: `sqr(sin(0.5, 100, 200)).out()`,
};

export const sqrShowcase: TestDefinition = {
	id: "sqr-showcase",
	category: "Oscillators",
	name: "sqr - showcase",
	desc: "Classic 8-bit arpeggio",
	code: `clock(240).seq("c4 e4 g4 c5 g4 e4").apply(s =>
  s.cv.sqr().gain({ level: s.gate.ar({ attack: 0.01, release: 0.05 }) }).out()
)`,
};

export const sqrTests = [sqrDefault, sqrAllParams, sqrModFreq, sqrShowcase];
