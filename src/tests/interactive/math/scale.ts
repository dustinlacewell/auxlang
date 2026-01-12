/**
 * scale - Map signal from one range to another
 *
 * Inputs:
 *   input: signal (default: 0) - input signal
 *   from: number (default: -1) - input range minimum
 *   to: number (default: 1) - input range maximum
 *   min: number (default: 0) - output range minimum
 *   max: number (default: 1) - output range maximum
 *
 * Outputs:
 *   val: scaled signal
 */

import type { TestDefinition } from "../types";

export const scaleDefault: TestDefinition = {
	id: "scale-default",
	category: "Math",
	name: "scale - defaults",
	desc: "Map LFO from [-1,1] to [0,1]",
	code: `saw(lfo().scale().scale({ from: 0, to: 1, min: 200, max: 400 })).out()`,
};

export const scaleAllParams: TestDefinition = {
	id: "scale-all-params",
	category: "Math",
	name: "scale - all params",
	desc: "Map LFO to frequency range",
	code: `saw(lfo().scale({ from: -1, to: 1, min: 200, max: 800 })).out()`,
};

export const scaleModMin: TestDefinition = {
	id: "scale-mod-min",
	category: "Math",
	name: "scale - modulated min",
	desc: "Rising floor on pitch range",
	code: `saw(lfo(2).scale({ from: -1, to: 1, min: lfo(0.1, 100, 300), max: 600 })).out()`,
};

export const scaleModMax: TestDefinition = {
	id: "scale-mod-max",
	category: "Math",
	name: "scale - modulated max",
	desc: "Shrinking pitch range",
	code: `saw(lfo(2).scale({ from: -1, to: 1, min: 200, max: lfo(0.1, 400, 800) })).out()`,
};

export const scaleShowcase: TestDefinition = {
	id: "scale-showcase",
	category: "Math",
	name: "scale - showcase",
	desc: "LFO controlling filter cutoff",
	code: `saw(110).lpf({ cutoff: lfo(0.5).scale({ from: -1, to: 1, min: 200, max: 2000 }) }).out()`,
};

export const scaleTests = [scaleDefault, scaleAllParams, scaleModMin, scaleModMax, scaleShowcase];
