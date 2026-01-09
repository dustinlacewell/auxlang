import type { TestDefinition } from "../types";

export const randMaybeAlt: TestDefinition = {
	id: "rand-maybe-alt",
	category: "Randomness",
	name: "maybe (?) - on alternation",
	desc: "Probability on alternating patterns: <c4 e4 g4>?",
	code: `let clk = clock(140)
let s = seq("<c4 e4 g4>?0.7 <g3 b3 d4>?0.7").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.02).decay(0.15).sustain(0.4).release(0.2)
return out(mult(lpf(tri(s.cv)).cutoff(2200)).by(env1.out))`,
};
