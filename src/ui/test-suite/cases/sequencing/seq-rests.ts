import type { TestDefinition } from "../types";

export const seqRests: TestDefinition = {
	id: "seq-rests",
	category: "Sequencing",
	name: "seq - rests (~)",
	desc: "Tilde creates silence - compare 'c4 ~ e4 ~' vs 'c4 e4'",
	code: `let clk = clock(120)
let s = seq("c4 ~ e4 ~ g4 ~ e4 ~").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.5).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).by(env1.out))`,
};
