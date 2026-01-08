import type { TestDefinition } from "../types";

export const randMaybeGroup: TestDefinition = {
	id: "rand-maybe-group",
	category: "Randomness",
	name: "maybe (?) - on groups",
	desc: "Probability on entire subdivisions: [c4 e4 g4]?",
	code: `let clk = clock(120)
let s = seq("[c4 e4 g4]? [g4 b4 d5]?").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1800)).by(env1.out))`,
};
