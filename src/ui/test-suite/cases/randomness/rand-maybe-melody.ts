import type { TestDefinition } from "../types";

export const randMaybeMelody: TestDefinition = {
	id: "rand-maybe-melody",
	category: "Randomness",
	name: "maybe (?) - evolving melody",
	desc: "Mix of certain and probabilistic notes",
	code: `let clk = clock(120)
let s = seq("c4 e4? g4 c5? g4 e4? c4 g3?").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.02).decay(0.2).sustain(0.4).release(0.15)
let voice = mult(lpf(tri(s.cv)).cutoff(2500)).by(env1.out)
return out(reverb(voice).room(0.4).wet(0.3))`,
};
