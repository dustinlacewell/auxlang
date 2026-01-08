import type { TestDefinition } from "../types";

export const seqMultiply: TestDefinition = {
	id: "seq-multiply",
	category: "Sequencing",
	name: "seq - multiply (*)",
	desc: "c4*4 = four c4s in one slot (fast repeat)",
	code: `let clk = clock(90)
let s = seq("c4*4 e4 g4*2 c5").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.05).sustain(0.3).release(0.02)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).by(env1.out))`,
};
