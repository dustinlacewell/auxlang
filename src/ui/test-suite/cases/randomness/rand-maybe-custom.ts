import type { TestDefinition } from "../types";

export const randMaybeCustom: TestDefinition = {
	id: "rand-maybe-custom",
	category: "Randomness",
	name: "maybe (?) - custom probability",
	desc: "Custom probabilities: ?0.2 = 20%, ?0.8 = 80%",
	code: `let clk = clock(140)
let s = seq("c4 e4?0.2 g4?0.8 c5?0.3").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.15)
return out(mult(lpf(tri(s.cv)).cutoff(2000)).by(env1.out))`,
};
