import type { TestDefinition } from "../types";

export const seqAlternation: TestDefinition = {
	id: "seq-alternation",
	category: "Sequencing",
	name: "seq - alternation (<>)",
	desc: "c4 c4 <c4 e4 g4> cycles each loop",
	code: `let clk = clock(180)
let s = seq("c4 c4 <c4 e4 g4>").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.4).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).b(env1.out))`,
};
