/**
 * tri - Triangle oscillator
 *
 * Inputs:
 *   freq: number (default: 440) - oscillator frequency
 *   min: number (default: -1) - output minimum
 *   max: number (default: 1) - output maximum
 *
 * Outputs:
 *   audio: triangle wave
 */

import type { TestDefinition } from "../types";

export const triDefault: TestDefinition = {
	id: "tri-default",
	category: "Oscillators",
	name: "tri - defaults",
	desc: "Triangle wave at 440Hz",
	code: `tri().out()`,
};

export const triAllParams: TestDefinition = {
	id: "tri-all-params",
	category: "Oscillators",
	name: "tri - all params",
	desc: "Triangle at 220Hz with scaled output",
	code: `tri({ freq: 220, min: -0.5, max: 0.5 }).out()`,
};

export const triModFreq: TestDefinition = {
	id: "tri-mod-freq",
	category: "Oscillators",
	name: "tri - modulated freq",
	desc: "Triangle with slow LFO modulation",
	code: `tri(sin(0.2, 200, 300)).out()`,
};

export const triShowcase: TestDefinition = {
	id: "tri-showcase",
	category: "Oscillators",
	name: "tri - showcase",
	desc: "Soft pad with triangle wave",
	code: `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.3, release: 0.5 }) }).out()
)`,
};

export const triTests = [triDefault, triAllParams, triModFreq, triShowcase];
