import type { TestDefinition } from "../types";

export const seqAlternation: TestDefinition = {
	id: "seq-alternation",
	category: "Sequencing",
	name: "seq - alternation (<>)",
	desc: "Angle brackets cycle through options each pattern loop",
	code: `let clk = clock(160)
let s = seq("c4 <e4 eb4> g4 <e4 f4>").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.4).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).by(env1.out))`,
};
