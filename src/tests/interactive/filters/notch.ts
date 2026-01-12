/**
 * notch - Notch filter (biquad)
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   cutoff: number (default: 1000) - notch frequency
 *   resonance: number (default: 0.5) - filter Q/width
 *
 * Outputs:
 *   audio: filtered signal
 */

import type { TestDefinition } from "../types";

export const notchDefault: TestDefinition = {
	id: "notch-default",
	category: "Filters",
	name: "notch - defaults",
	desc: "Notch at 1kHz on saw",
	code: `saw(110).notch().out()`,
};

export const notchAllParams: TestDefinition = {
	id: "notch-all-params",
	category: "Filters",
	name: "notch - all params",
	desc: "Notch with explicit cutoff and resonance",
	code: `saw(110).notch({ cutoff: 440, resonance: 0.8 }).out()`,
};

export const notchModCutoff: TestDefinition = {
	id: "notch-mod-cutoff",
	category: "Filters",
	name: "notch - modulated cutoff",
	desc: "Phaser-like effect with sweeping notch",
	code: `saw(110).notch({ cutoff: lfo(0.2, 300, 1500), resonance: 0.7 }).out()`,
};

export const notchModResonance: TestDefinition = {
	id: "notch-mod-resonance",
	category: "Filters",
	name: "notch - modulated resonance",
	desc: "Notch width modulation",
	code: `saw(110).notch({ cutoff: 800, resonance: lfo(0.3, 0.3, 0.9) }).out()`,
};

export const notchShowcase: TestDefinition = {
	id: "notch-showcase",
	category: "Filters",
	name: "notch - showcase",
	desc: "Slow phaser sweep",
	code: `saw(55).notch({ cutoff: lfo(0.1, 100, 2000), resonance: 0.85 }).out()`,
};

export const notchTests = [notchDefault, notchAllParams, notchModCutoff, notchModResonance, notchShowcase];
