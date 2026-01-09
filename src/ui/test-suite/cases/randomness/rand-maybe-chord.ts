import type { TestDefinition } from "../types";

export const randMaybeChord: TestDefinition = {
	id: "rand-maybe-chord",
	category: "Randomness",
	name: "maybe (?) - on chords",
	desc: "Probabilistic chord hits: c4,e4,g4?",
	code: `let clk = clock(100)
let s = seq("c3,e3,g3? ~ e3,g3,b3? ~").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.3).sustain(0.5).release(0.4)
return out(mult(lpf(saw(s.cv)).cutoff(1200).resonance(0.2)).by(env1.out))`,
};
