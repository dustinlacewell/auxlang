import type { TestDefinition } from "../types";

export const logicLt: TestDefinition = {
	id: "logic-lt",
	category: "Logic",
	name: "lt - intro only",
	desc: "Sound only in first 4 beats",
	code: `let clk = clock(120)
let introOn = counter(clk.trig).max(8).count.lt({ than: 4 })
let s = seq("c4 e4 g4 c5").clk(clk.trig)
let e = s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 })
s.cv.saw().mult({ by: e }).mult({ by: introOn }).out()`,
};
