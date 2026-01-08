import type { TestDefinition } from "../types";

export const seqRests: TestDefinition = {
	id: "seq-rests",
	category: "Sequencing",
	name: "seq - rests (~)",
	desc: "Tilde (~) creates silent steps between notes",
	code: `let clk = clock(120)
let s = seq("g4 ~ ~ e4 ~ ~ c4 ~").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.5).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).by(env1.out))`,
};
