import type { TestDefinition } from "../types";

export const mathDiv: TestDefinition = {
	id: "math-div",
	category: "Math",
	name: "div - signal division",
	desc: "Envelope divided for gentler decay curve",
	code: `let clk = clock(80)
let s = seq("c4 e4 g4 c5").clk(clk.trig)
let e = s.gate.env({ attack: 0.01, release: 0.8 })
let gentleEnv = e.add({ to: 1 }).div({ by: 2 })
s.cv.osc().mult({ by: gentleEnv }).out()`,
};
