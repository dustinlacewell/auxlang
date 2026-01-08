import type { TestDefinition } from "../types";

export const delaySlapback: TestDefinition = {
	id: "delay-slapback",
	category: "Effects",
	name: "delay - slapback",
	desc: "Short delay, no feedback - classic slapback echo",
	code: `let clk = clock(110)
let s = seq("g3 ~ a3 b3 c4 ~ b3 a3").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
let dry = mult(lpf(saw(s.cv)).cutoff(1200)).by(e.out)
return out(delay(dry).time(0.08).feedback(0.1).mix(0.35))`,
};
