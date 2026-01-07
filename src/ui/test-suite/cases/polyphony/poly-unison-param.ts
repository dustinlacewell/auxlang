import type { TestDefinition } from "../types";

export const polyUnisonParam: TestDefinition = {
	id: "poly-unison-param",
	category: "Polyphony",
	name: ".poly(4).detune(15)",
	desc: "Supersaw via poly/detune params - thick and wide",
	code: `let clk = clock(120)
let s = seq("c3 g3 c3 eb3").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.2)
let voice = sawOsc(s.cv).poly(4).detune(15)
return out(gain(mult(lpf(voice).cutoff(1500)).b(e.out)).amount(0.12))`,
};
