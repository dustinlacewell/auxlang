/**
 * lpf - Lowpass filter (biquad)
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   cutoff: number (default: 1000) - filter cutoff frequency
 *   resonance: number (default: 0) - filter resonance
 *
 * Outputs:
 *   audio: filtered signal
 */

import type { TestDefinition } from "../types";

export const lpfDefault: TestDefinition = {
	id: "lpf-default",
	category: "Filters",
	name: "lpf - defaults",
	desc: "Lowpass at 1kHz on saw",
	code: `saw(110).lpf().out()`,
};

export const lpfAllParams: TestDefinition = {
	id: "lpf-all-params",
	category: "Filters",
	name: "lpf - all params",
	desc: "Lowpass with explicit cutoff and resonance",
	code: `saw(110).lpf({ cutoff: 500, resonance: 0.5 }).out()`,
};

export const lpfModCutoff: TestDefinition = {
	id: "lpf-mod-cutoff",
	category: "Filters",
	name: "lpf - modulated cutoff",
	desc: "Classic filter sweep with LFO",
	code: `saw(110).lpf({ cutoff: sin(0.5, 200, 2000) }).out()`,
};

export const lpfModResonance: TestDefinition = {
	id: "lpf-mod-resonance",
	category: "Filters",
	name: "lpf - modulated resonance",
	desc: "Resonance sweep with fixed cutoff",
	code: `saw(110).lpf({ cutoff: 800, resonance: sin(0.3, 0, 0.8) }).out()`,
};

export const lpfShowcase: TestDefinition = {
	id: "lpf-showcase",
	category: "Filters",
	name: "lpf - showcase",
	desc: "Envelope-controlled filter on bass",
	code: `clock(120).seq("c2 c2 eb2 c2").apply(s =>
  s.cv.saw().lpf({ cutoff: s.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.1 }).scale({ from: 0, to: 1, min: 200, max: 2000 }), resonance: 0.4 }).out()
)`,
};

export const lpfTests = [lpfDefault, lpfAllParams, lpfModCutoff, lpfModResonance, lpfShowcase];
