import type { TestDefinition } from "../types";

export const logicAnd: TestDefinition = {
	id: "logic-and",
	category: "Logic",
	name: "and - range gate",
	desc: "Sound only in beats 2-5",
	code: `let clk = clock(120)
let cnt = counter(clk.trig).max(8)
let inRange = and(gte(cnt.count).b(2)).b(lt(cnt.count).b(6))
let s = seq("c4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.4).release(0.1)
return out(mult(mult(saw(s.cv)).b(e.out)).b(inRange))`,
};
