import type { TestDefinition } from "../types";

export const bpfResonant: TestDefinition = {
	id: "bpf-resonant",
	category: "Filters",
	name: "bpf - resonant",
	desc: "Bandpass with high resonance - should be stable",
	code: `saw(55).bpf({ cutoff: 400, resonance: 0.85 }).gain(0.4).out()`,
};
