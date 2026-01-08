import type { TestDefinition } from "../types";

export const logicLt: TestDefinition = {
	id: "logic-lt",
	category: "Logic",
	name: "lt - intro only",
	desc: "Sound only in first 4 beats",
	code: `let clk = clock(120)
let cnt = counter(clk.trig).max(8)
let introOn = lt(cnt.count).than(4)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(mult(saw(s.cv)).by(e.out)).by(introOn))`,
};
