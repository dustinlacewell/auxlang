import type { TestDefinition } from "../types";

export const hpfResonant: TestDefinition = {
	id: "hpf-resonant",
	category: "Filters",
	name: "hpf - resonant",
	desc: "Highpass with high resonance - should be stable",
	code: `return out(gain(hpf(saw(55)).cutoff(400).resonance(0.85)).amount(0.3))`,
};
