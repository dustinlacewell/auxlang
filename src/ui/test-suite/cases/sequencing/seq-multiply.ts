import type { TestDefinition } from "../types";

export const seqMultiply: TestDefinition = {
	id: "seq-multiply",
	category: "Sequencing",
	name: "seq - multiply (*)",
	desc: "Asterisk repeats a note - c4*4 plays four c4s in one step",
	code: `let clk = clock(110)
let s = seq("a4*2 g4 f4 e4*3 d4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.05).sustain(0.3).release(0.02)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).by(env1.out))`,
};
