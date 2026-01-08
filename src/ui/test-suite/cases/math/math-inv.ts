import type { TestDefinition } from "../types";

export const mathInv: TestDefinition = {
	id: "math-inv",
	category: "Math",
	name: "inv - signal inversion",
	desc: "Two detuned saws, one inverted - creates hollow sound",
	code: `let freq = 110
let saw1 = saw(freq)
let saw2 = inv(saw(mult(freq).by(1.01)))
let mixed = add(saw1).to(saw2)
return out(gain(lpf(mixed).cutoff(2000)).amount(0.3))`,
};
