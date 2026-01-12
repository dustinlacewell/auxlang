/**
 * noise - White noise generator
 *
 * Inputs:
 *   min: number (default: -1) - output minimum
 *   max: number (default: 1) - output maximum
 *
 * Outputs:
 *   audio: random values between min and max
 */

import type { TestDefinition } from "../types";

export const noiseDefault: TestDefinition = {
	id: "noise-default",
	category: "Oscillators",
	name: "noise - defaults",
	desc: "White noise at full range",
	code: `noise().gain(0.3).out()`,
};

export const noiseAllParams: TestDefinition = {
	id: "noise-all-params",
	category: "Oscillators",
	name: "noise - all params",
	desc: "Noise with reduced range",
	code: `noise({ min: -0.5, max: 0.5 }).out()`,
};

export const noiseModMin: TestDefinition = {
	id: "noise-mod-min",
	category: "Oscillators",
	name: "noise - modulated min",
	desc: "Noise with LFO-modulated minimum (DC offset sweep)",
	code: `noise({ min: lfo(0.5, -1, 0), max: 1 }).gain(0.3).out()`,
};

export const noiseShowcase: TestDefinition = {
	id: "noise-showcase",
	category: "Oscillators",
	name: "noise - showcase",
	desc: "Filtered noise burst on triggers",
	code: `clock(120).seq("c4 ~ c4 c4").apply(s =>
  noise().lpf({ cutoff: 2000 }).gain({ level: s.gate.env({ attack: 0.01, release: 0.1 }) }).out()
)`,
};

export const noiseTests = [noiseDefault, noiseAllParams, noiseModMin, noiseShowcase];
