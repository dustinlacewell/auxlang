import type { TestDefinition } from "../types";

export const polyUnisonSubtle: TestDefinition = {
	id: "poly-unison-subtle",
	category: "Polyphony",
	name: ".poly(2).detune(5)",
	desc: "Two detuned voices for subtle chorus widening",
	code: `let clk = clock(100)
let s = seq("g4 a4 b4 d5 b4 a4 g4 ~ f#4 g4 a4 c5 a4 g4 f#4 ~").clk(clk.trig)
let e = adsr(s.gate).attack(0.1).decay(0.3).sustain(0.6).release(0.3)
let voice = osc(s.cv).poly(2).detune(5)
return out(gain(mult(voice).by(e.out)).amount(0.2))`,
};
