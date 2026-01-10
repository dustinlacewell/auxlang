import type { TestDefinition } from "../types";

export const notchResonant: TestDefinition = {
	id: "notch-resonant",
	category: "Filters",
	name: "notch - resonant",
	desc: "Notch with high resonance - narrow notch",
	code: `noise().notch({ cutoff: 800, resonance: 0.85 }).gain({ level: 0.3 }).out()`,
};
