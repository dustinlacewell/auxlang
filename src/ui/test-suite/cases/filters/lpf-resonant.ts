import type { TestDefinition } from "../types";

export const lpfResonant: TestDefinition = {
	id: "lpf-resonant",
	category: "Filters",
	name: "lpf - resonant",
	desc: "Lowpass with high resonance - should be stable",
	code: `saw(55).lpf({ cutoff: 400, resonance: 0.85 }).gain({ level: 0.3 }).out()`,
};
