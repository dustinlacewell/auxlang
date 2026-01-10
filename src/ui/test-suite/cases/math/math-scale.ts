import type { TestDefinition } from "../types";

export const mathScale: TestDefinition = {
	id: "math-scale",
	category: "Math",
	name: "scale - range mapping",
	desc: "LFO mapped to filter cutoff range 200-2000Hz",
	code: `let cutoff = lfo(0.5).scale({ min: 200, max: 2000 })
saw(110).lpf({ cutoff, resonance: 0.5 }).gain({ level: 0.4 }).out()`,
};
