import type { TestDefinition } from "../types";

export const seqRests: TestDefinition = {
	id: "seq-rests",
	category: "Sequencing",
	name: "seq - rests (~)",
	desc: "Notes with gaps - c4 _ e4 _",
	code: `let clk = clock(120)
let s = seq("c4 ~ e4 ~").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.5).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).b(env1.out))`,
};
