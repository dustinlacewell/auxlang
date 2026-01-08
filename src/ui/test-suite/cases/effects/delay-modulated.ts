import type { TestDefinition } from "../types";

export const delayModulated: TestDefinition = {
	id: "delay-modulated",
	category: "Effects",
	name: "delay - modulated time",
	desc: "Delay time modulated by LFO for chorus-like effect",
	code: `let clk = clock(100)
let s = seq("c4 ~ e4 ~ g4 ~ e4 ~").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.4).release(0.2)
let dry = mult(osc(s.cv)).by(e.out)
let modTime = lfo(0.3).min(0.015).max(0.025)
return out(delay(dry).time(modTime).feedback(0.3).mix(0.4))`,
};
