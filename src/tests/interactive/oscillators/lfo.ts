/**
 * sin as LFO - Using sin oscillator for low frequency modulation
 *
 * Inputs:
 *   freq: number (default: 440) - frequency in Hz
 *   min: number (default: -1) - output minimum
 *   max: number (default: 1) - output maximum
 *   phase: number (default: 0) - initial phase 0-1
 *
 * Outputs:
 *   cv: sine wave between min and max
 */

import type { TestDefinition } from "../types";

export const lfoDefault: TestDefinition = {
	id: "lfo-default",
	category: "Oscillators",
	name: "sin as lfo - defaults",
	desc: "Sine at 1Hz modulating a saw pitch",
	code: `saw(sin(1).scale({ from: -1, to: 1, min: 200, max: 400 })).out()`,
};

export const lfoAllParams: TestDefinition = {
	id: "lfo-all-params",
	category: "Oscillators",
	name: "sin as lfo - all params",
	desc: "Sine with explicit freq, min, max",
	code: `saw(sin(2, 200, 400)).out()`,
};

export const lfoModRate: TestDefinition = {
	id: "lfo-mod-rate",
	category: "Oscillators",
	name: "sin as lfo - modulated freq",
	desc: "Sine with freq modulated by another sine",
	code: `saw(sin(sin(0.1, 0.5, 4), 200, 400)).out()`,
};

export const lfoModMin: TestDefinition = {
	id: "lfo-mod-min",
	category: "Oscillators",
	name: "sin as lfo - modulated min",
	desc: "Sine with modulated minimum (rising floor)",
	code: `saw(sin({ freq: 2, min: sin(0.1, 100, 300), max: 500 })).out()`,
};

export const lfoModMax: TestDefinition = {
	id: "lfo-mod-max",
	category: "Oscillators",
	name: "sin as lfo - modulated max",
	desc: "Sine with modulated maximum (shrinking range)",
	code: `saw(sin({ freq: 2, min: 200, max: sin(0.2, 300, 600) })).out()`,
};

export const lfoShowcase: TestDefinition = {
	id: "lfo-showcase",
	category: "Oscillators",
	name: "sin as lfo - showcase",
	desc: "Classic filter sweep with sine LFO",
	code: `saw(110).lpf({ cutoff: sin(0.25, 200, 2000), resonance: 0.5 }).out()`,
};

export const lfoTests = [lfoDefault, lfoAllParams, lfoModRate, lfoModMin, lfoModMax, lfoShowcase];
