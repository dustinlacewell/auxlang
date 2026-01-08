import type { TestDefinition } from "../types";

export const polyUnisonSubtle: TestDefinition = {
	id: "poly-unison-subtle",
	category: "Polyphony",
	name: ".poly(2).detune(5)",
	desc: "Subtle 2-voice chorus - gentle widening",
	code: `let clk = clock(90)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let e = adsr(s.gate).attack(0.1).decay(0.3).sustain(0.6).release(0.3)
let voice = osc(s.cv).poly(2).detune(5)
return out(gain(mult(voice).by(e.out)).amount(0.2))`,
};
