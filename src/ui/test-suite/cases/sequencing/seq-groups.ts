import type { TestDefinition } from "../types";

export const seqGroups: TestDefinition = {
	id: "seq-groups",
	category: "Sequencing",
	name: "seq - groups []",
	desc: "Brackets subdivide time - [a b] fits two notes in one step",
	code: `let clk = clock(130)
let s = seq("e4 [e4 e4] f4 g4 [g4 f4] e4 d4").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.08).sustain(0.3).release(0.05)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).by(env1.out))`,
};
