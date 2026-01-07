import type { TestDefinition } from "../types";

export const lpfResonant: TestDefinition = {
	id: "lpf-resonant",
	category: "Filters",
	name: "lpf - resonant",
	desc: "High resonance - whistly peak",
	code: `return out(gain(lpf(saw(110)).cutoff(800).resonance(0.8)).amount(0.2))`,
};
