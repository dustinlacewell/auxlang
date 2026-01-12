/**
 * hpf - Highpass filter (biquad)
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   cutoff: number (default: 200) - filter cutoff frequency
 *   resonance: number (default: 0) - filter resonance
 *
 * Outputs:
 *   audio: filtered signal
 */

import type { TestDefinition } from "../types";

export const hpfDefault: TestDefinition = {
	id: "hpf-default",
	category: "Filters",
	name: "hpf - defaults",
	desc: "Highpass at 200Hz on saw",
	code: `saw(110).hpf().out()`,
};

export const hpfAllParams: TestDefinition = {
	id: "hpf-all-params",
	category: "Filters",
	name: "hpf - all params",
	desc: "Highpass with explicit cutoff and resonance",
	code: `saw(110).hpf({ cutoff: 500, resonance: 0.3 }).out()`,
};

export const hpfModCutoff: TestDefinition = {
	id: "hpf-mod-cutoff",
	category: "Filters",
	name: "hpf - modulated cutoff",
	desc: "Highpass sweep with LFO",
	code: `saw(110).hpf({ cutoff: lfo(0.5, 100, 800) }).out()`,
};

export const hpfModResonance: TestDefinition = {
	id: "hpf-mod-resonance",
	category: "Filters",
	name: "hpf - modulated resonance",
	desc: "Resonance modulation on highpass",
	code: `saw(110).hpf({ cutoff: 400, resonance: lfo(0.2, 0, 0.6) }).out()`,
};

export const hpfShowcase: TestDefinition = {
	id: "hpf-showcase",
	category: "Filters",
	name: "hpf - showcase",
	desc: "Filtered hihat with sweep",
	code: `clock(240).seq("c4*4").apply(s =>
  s.trig.hihat().hpf({ cutoff: lfo(0.25, 2000, 10000) }).out()
)`,
};

export const hpfTests = [hpfDefault, hpfAllParams, hpfModCutoff, hpfModResonance, hpfShowcase];
