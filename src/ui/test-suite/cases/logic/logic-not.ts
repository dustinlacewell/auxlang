import type { TestDefinition } from "../types";

export const logicNot: TestDefinition = {
	id: "logic-not",
	category: "Logic",
	name: "not - logical NOT",
	desc: "Snare on every beat EXCEPT beat 1",
	code: `let clk = clock(120)
let cnt = counter(clk.trig)
let beat1 = eq(mod(cnt.count).by(4)).to(0)
let notBeat1 = not(beat1)
let e = mult(env(clk.trig).attack(0.001).release(0.15).out).by(notBeat1)
return out(mult(snare(clk.trig)).by(e))`,
};
