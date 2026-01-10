import type { TestDefinition } from "../types";

export const logicNot: TestDefinition = {
	id: "logic-not",
	category: "Logic",
	name: "not - logical NOT",
	desc: "Snare on every beat EXCEPT beat 1",
	code: `let clk = clock(120)
let notBeat1 = counter(clk.trig).count.mod({ by: 4 }).eq({ to: 0 }).not()
let e = clk.trig.env({ attack: 0.001, release: 0.15 }).mult({ by: notBeat1 })
snare(clk.trig).mult({ by: e }).out()`,
};
