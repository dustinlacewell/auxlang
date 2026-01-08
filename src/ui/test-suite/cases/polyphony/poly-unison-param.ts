import type { TestDefinition } from "../types";

export const polyUnisonParam: TestDefinition = {
	id: "poly-unison-param",
	category: "Polyphony",
	name: ".poly(4).detune(15)",
	desc: "Four detuned voices create thick supersaw texture",
	code: `let clk = clock(110)
let s = seq("a2 ~ ~ ~ e3 ~ ~ ~ f3 ~ ~ ~ g3 ~ ~ ~").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.2)
let voice = sawOsc(s.cv).poly(4).detune(15)
return out(gain(mult(lpf(voice).cutoff(1500)).by(e.out)).amount(0.12))`,
};
