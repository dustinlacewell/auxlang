import type { TestDefinition } from "../types";

export const polySeqMixed: TestDefinition = {
	id: "poly-seq-mixed",
	category: "Polyphony",
	name: "mixed mono/poly sequence",
	desc: "Bass note followed by chord stabs",
	code: `let clk = clock(120)
let s = seq("c2 c4,e4,g4 c2 g3,b3,d4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.2).release(0.1)
return out(gain(mult(lpf(saw(s.cv)).cutoff(1000)).b(e.out)).amount(0.15))`,
};
