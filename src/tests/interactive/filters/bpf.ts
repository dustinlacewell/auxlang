/**
 * bpf - Bandpass filter (biquad)
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   cutoff: number (default: 1000) - center frequency
 *   resonance: number (default: 0.5) - filter Q/resonance
 *
 * Outputs:
 *   audio: filtered signal
 */

import type { TestDefinition } from "../types";

export const bpfDefault: TestDefinition = {
	id: "bpf-default",
	category: "Filters",
	name: "bpf - defaults",
	desc: "Bandpass at 1kHz on noise",
	code: `noise().bpf().gain(2).out()`,
};

export const bpfAllParams: TestDefinition = {
	id: "bpf-all-params",
	category: "Filters",
	name: "bpf - all params",
	desc: "Bandpass with explicit cutoff and resonance",
	code: `noise().bpf({ cutoff: 800, resonance: 0.8 }).gain(3).out()`,
};

export const bpfModCutoff: TestDefinition = {
	id: "bpf-mod-cutoff",
	category: "Filters",
	name: "bpf - modulated cutoff",
	desc: "Sweeping bandpass formant",
	code: `noise().bpf({ cutoff: sin(0.3, 300, 2000), resonance: 0.7 }).gain(3).out()`,
};

export const bpfModResonance: TestDefinition = {
	id: "bpf-mod-resonance",
	category: "Filters",
	name: "bpf - modulated resonance",
	desc: "Resonance modulation on bandpass",
	code: `saw(110).bpf({ cutoff: 800, resonance: sin(0.5, 0.3, 0.9) }).gain(2).out()`,
};

export const bpfShowcase: TestDefinition = {
	id: "bpf-showcase",
	category: "Filters",
	name: "bpf - showcase",
	desc: "Vowel-like formant on saw",
	code: `saw(110).bpf({ cutoff: sin(0.2, 400, 1200), resonance: 0.85 }).gain(3).out()`,
};

export const bpfTests = [bpfDefault, bpfAllParams, bpfModCutoff, bpfModResonance, bpfShowcase];
