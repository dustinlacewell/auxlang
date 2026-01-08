import type { TestDefinition } from "../types";

export const seqReplicate: TestDefinition = {
	id: "seq-replicate",
	category: "Sequencing",
	name: "seq - replicate (!)",
	desc: "c4!3 = three c4s taking 3 slots",
	code: `let clk = clock(120)
let s = seq("c4!3 g4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.5).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).by(env1.out))`,
};
