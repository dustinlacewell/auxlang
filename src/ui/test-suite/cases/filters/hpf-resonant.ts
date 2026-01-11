import type { TestDefinition } from "../types";

export const hpfResonant: TestDefinition = {
	id: "hpf-resonant",
	category: "Filters",
	name: "hpf - resonant",
	desc: "Highpass with high resonance - should be stable",
	code: `saw(55).hpf({ cutoff: 400, resonance: 0.85 }).gain(0.3).out()`,
};
