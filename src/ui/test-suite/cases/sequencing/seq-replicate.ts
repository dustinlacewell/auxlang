import type { TestDefinition } from "../types";

export const seqReplicate: TestDefinition = {
	id: "seq-replicate",
	category: "Sequencing",
	name: "seq - replicate (!)",
	desc: "Bang expands note copies - c4!3 becomes c4 c4 c4",
	code: `let clk = clock(140)
let s = seq("g4!2 e4 c4!3 d4 e4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.5).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).by(env1.out))`,
};
