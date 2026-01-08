import type { TestDefinition } from "../types";

export const seqGroups: TestDefinition = {
	id: "seq-groups",
	category: "Sequencing",
	name: "seq - groups []",
	desc: "Subdivided notes - [c4 e4] plays twice as fast",
	code: `let clk = clock(120)
let s = seq("c4 [e4 g4] c5 [g4 e4]").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.08).sustain(0.3).release(0.05)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).by(env1.out))`,
};
