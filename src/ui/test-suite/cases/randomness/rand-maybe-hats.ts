import type { TestDefinition } from "../types";

export const randMaybeHats: TestDefinition = {
	id: "rand-maybe-hats",
	category: "Randomness",
	name: "maybe (?) - random hats",
	desc: "Probabilistic hi-hat pattern in subdivisions",
	code: `let clk = clock(130)
let s = seq("[c5? c5? c5? c5?]").clk(clk.trig)
let env1 = env(s.gate).release(0.05)
return out(mult(hpf(noise()).cutoff(8000)).by(env1.out))`,
};
