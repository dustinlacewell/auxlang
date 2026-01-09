import type { TestDefinition } from "../types";

export const randMaybeBasic: TestDefinition = {
	id: "rand-maybe-basic",
	category: "Randomness",
	name: "maybe (?) - basic",
	desc: "Each note has 50% chance to play",
	code: `let clk = clock(160)
let s = seq("c4? e4? g4? c5?").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.2).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500).resonance(0.3)).by(env1.out))`,
};
