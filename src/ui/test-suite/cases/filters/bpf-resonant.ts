import type { TestDefinition } from "../types";

export const bpfResonant: TestDefinition = {
	id: "bpf-resonant",
	category: "Filters",
	name: "bpf - resonant",
	desc: "Bandpass with high resonance - should be stable",
	code: `return out(gain(bpf(saw(55)).cutoff(400).resonance(0.85)).amount(0.4))`,
};
