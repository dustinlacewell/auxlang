import type { TestDefinition } from "../types";

export const lpfResonant: TestDefinition = {
	id: "lpf-resonant",
	category: "Filters",
	name: "lpf - resonant",
	desc: "Lowpass with high resonance - should be stable",
	code: `return out(gain(lpf(saw(55)).cutoff(400).resonance(0.85)).amount(0.3))`,
};
