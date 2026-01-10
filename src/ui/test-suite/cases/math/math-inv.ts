import type { TestDefinition } from "../types";

export const mathInv: TestDefinition = {
	id: "math-inv",
	category: "Math",
	name: "inv - signal inversion",
	desc: "Two detuned saws, one inverted - creates hollow sound",
	code: `let freq = 110
let saw1 = saw(freq)
let saw2 = saw(freq * 1.01).inv()
saw1.add({ to: saw2 }).lpf({ cutoff: 2000 }).gain({ level: 0.3 }).out()`,
};
