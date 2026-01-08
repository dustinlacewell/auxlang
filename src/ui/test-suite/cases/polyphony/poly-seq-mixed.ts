import type { TestDefinition } from "../types";

export const polySeqMixed: TestDefinition = {
	id: "poly-seq-mixed",
	category: "Polyphony",
	name: "mixed mono/poly sequence",
	desc: "Single notes and chords in same sequence",
	code: `let clk = clock(115)
let s = seq("e2 e3,g#3,b3 e2 e3,g#3,b3 a2 a3,c#4,e4 b2 b3,d#4,f#4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.2).release(0.1)
return out(gain(mult(lpf(saw(s.cv)).cutoff(1000)).by(e.out)).amount(0.15))`,
};
