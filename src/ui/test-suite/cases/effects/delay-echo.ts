import type { TestDefinition } from "../types";

export const delayEcho: TestDefinition = {
	id: "delay-echo",
	category: "Effects",
	name: "delay - echo",
	desc: "Delay with feedback - repeating echoes",
	code: `let clk = clock(120)
let s = seq("c4 ~ ~ ~ e4 ~ ~ ~").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.2).release(0.1)
let dry = mult(lpf(saw(s.cv)).cutoff(1500)).b(e.out)
return out(delay(dry).time(0.25).feedback(0.5).mix(0.4))`,
};
