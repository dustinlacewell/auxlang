import type { TestDefinition } from "../types";

export const mathAbs: TestDefinition = {
	id: "math-abs",
	category: "Math",
	name: "abs - full-wave rectify",
	desc: "LFO rectified for double-speed unipolar modulation",
	code: `let cutoff = lfo(2).abs().mult({ by: 1500 }).add({ to: 300 })
saw(55).lpf({ cutoff, resonance: 0.6 }).gain({ level: 0.4 }).out()`,
};
