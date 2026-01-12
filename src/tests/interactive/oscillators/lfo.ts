/**
 * lfo - Low frequency oscillator
 *
 * Inputs:
 *   rate: number (default: 1) - LFO frequency in Hz
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
	name: "lfo - defaults",
	desc: "LFO at 1Hz modulating a saw pitch",
	code: `saw(lfo().scale({ from: -1, to: 1, min: 200, max: 400 })).out()`,
};

export const lfoAllParams: TestDefinition = {
	id: "lfo-all-params",
	category: "Oscillators",
	name: "lfo - all params",
	desc: "LFO with explicit rate, min, max",
	code: `saw(lfo(2, 200, 400)).out()`,
};

export const lfoModRate: TestDefinition = {
	id: "lfo-mod-rate",
	category: "Oscillators",
	name: "lfo - modulated rate",
	desc: "LFO with rate modulated by another LFO",
	code: `saw(lfo(lfo(0.1, 0.5, 4), 200, 400)).out()`,
};

export const lfoModMin: TestDefinition = {
	id: "lfo-mod-min",
	category: "Oscillators",
	name: "lfo - modulated min",
	desc: "LFO with modulated minimum (rising floor)",
	code: `saw(lfo({ rate: 2, min: lfo(0.1, 100, 300), max: 500 })).out()`,
};

export const lfoModMax: TestDefinition = {
	id: "lfo-mod-max",
	category: "Oscillators",
	name: "lfo - modulated max",
	desc: "LFO with modulated maximum (shrinking range)",
	code: `saw(lfo({ rate: 2, min: 200, max: lfo(0.2, 300, 600) })).out()`,
};

export const lfoShowcase: TestDefinition = {
	id: "lfo-showcase",
	category: "Oscillators",
	name: "lfo - showcase",
	desc: "Classic filter sweep with LFO",
	code: `saw(110).lpf({ cutoff: lfo(0.25, 200, 2000), resonance: 0.5 }).out()`,
};

export const lfoTests = [lfoDefault, lfoAllParams, lfoModRate, lfoModMin, lfoModMax, lfoShowcase];
