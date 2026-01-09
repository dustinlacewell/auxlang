import type { TestDefinition } from "../types";

export const seqEuclidean: TestDefinition = {
	id: "seq-euclidean",
	category: "Sequencing",
	name: "seq - euclidean (k,n)",
	desc: "c4(3,8) = 3 hits spread over 8 steps",
	code: `let clk = clock(140)
let s = seq("c4(3,8)").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).by(env1.out))`,
};
