import type { TestDefinition } from "../types";

export const logicAnd: TestDefinition = {
	id: "logic-and",
	category: "Logic",
	name: "and - range gate",
	desc: "Sound only in beats 2-5",
	code: `let clk = clock(120)
let cnt = counter(clk.trig).max(8).count
let inRange = cnt.gte({ than: 2 }).and({ with: cnt.lt({ than: 6 }) })
let s = seq("c4").clk(clk.trig)
let e = s.gate.adsr({ attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.1 })
s.cv.saw().mult({ by: e }).mult({ by: inRange }).out()`,
};
