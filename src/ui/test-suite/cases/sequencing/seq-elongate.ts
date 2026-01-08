import type { TestDefinition } from "../types";

export const seqElongate: TestDefinition = {
	id: "seq-elongate",
	category: "Sequencing",
	name: "seq - elongate (@)",
	desc: "At-sign holds note duration - c4@3 sustains for 3 steps",
	code: `let clk = clock(130)
let s = seq("c4@2 d4 e4@3 d4 c4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.7).release(0.3)
return out(mult(lpf(saw(s.cv)).cutoff(1200)).by(env1.out))`,
};
