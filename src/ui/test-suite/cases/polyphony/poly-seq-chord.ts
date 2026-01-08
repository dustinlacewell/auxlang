import type { TestDefinition } from "../types";

export const polySeqChord: TestDefinition = {
	id: "poly-seq-chord",
	category: "Polyphony",
	name: "sequenced chords (comma syntax)",
	desc: "c4,e4,g4 = C major triad in mini-notation",
	code: `let clk = clock(120)
let s = seq("c4,e4,g4 ~ f4,a4,c5 ~").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.2)
return out(gain(mult(lpf(saw(s.cv)).cutoff(1200)).by(e.out)).amount(0.12))`,
};
