import type { TestDefinition } from "../types";

export const mathDiv: TestDefinition = {
	id: "math-div",
	category: "Math",
	name: "div - signal division",
	desc: "Envelope divided for gentler decay curve",
	code: `let clk = clock(80)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let e = env(s.gate).attack(0.01).release(0.8)
let gentleEnv = div(add(e.out).to(1)).by(2)
return out(mult(osc(s.cv)).by(gentleEnv))`,
};
