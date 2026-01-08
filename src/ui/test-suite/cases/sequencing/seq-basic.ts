import type { TestDefinition } from "../types";

export const seqBasic: TestDefinition = {
	id: "seq-basic",
	category: "Sequencing",
	name: "seq - basic notes",
	desc: "C major arpeggio - should hear c4 e4 g4 c5",
	code: `let clk = clock(120)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).by(env1.out))`,
};
