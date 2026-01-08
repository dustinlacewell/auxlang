import type { TestDefinition } from "../types";

export const seqElongate: TestDefinition = {
	id: "seq-elongate",
	category: "Sequencing",
	name: "seq - elongate (@)",
	desc: "c4@3 = c4 held for 3 slots",
	code: `let clk = clock(120)
let s = seq("c4@3 g4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.7).release(0.3)
return out(mult(lpf(saw(s.cv)).cutoff(1200)).by(env1.out))`,
};
