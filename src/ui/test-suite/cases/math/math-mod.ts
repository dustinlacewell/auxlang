import type { TestDefinition } from "../types";

export const mathMod: TestDefinition = {
	id: "math-mod",
	category: "Math",
	name: "mod - modulo wrap",
	desc: "Counter modulo creates repeating 4-step cutoff pattern",
	code: `let clk = clock(140)
let cutoff = counter(clk.trig).count.mod({ by: 4 }).mult({ by: 400 }).add({ to: 400 })
let s = seq("c3 c3 g3 c3").clk(clk.trig)
let e = s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 })
s.cv.saw().lpf({ cutoff, resonance: 0.3 }).mult({ by: e }).out()`,
};
