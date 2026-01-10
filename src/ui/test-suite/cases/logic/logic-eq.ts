import type { TestDefinition } from "../types";

export const logicEq: TestDefinition = {
	id: "logic-eq",
	category: "Logic",
	name: "eq - equals comparison",
	desc: "Accent on every 4th beat (count equals 0 mod 4)",
	code: `let clk = clock(140)
let beat4 = counter(clk.trig).count.mod({ by: 4 }).eq({ to: 0 })
let accentGain = beat4.mult({ by: 0.3 }).add({ to: 0.7 })
let s = seq("c3 e3 g3 c4").clk(clk.trig)
let e = s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 })
s.cv.saw().lpf({ cutoff: 1500 }).mult({ by: e }).mult({ by: accentGain }).out()`,
};
