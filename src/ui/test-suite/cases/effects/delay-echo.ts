import type { TestDefinition } from "../types";

export const delayEcho: TestDefinition = {
	id: "delay-echo",
	category: "Effects",
	name: "delay - echo",
	desc: "Digital delay with feedback for repeating echoes",
	code: `let clk = clock(130)
let s = seq("e4 g4 a4 b4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.2).release(0.1)
let dry = mult(lpf(saw(s.cv)).cutoff(1500)).by(e.out)
return out(delay(dry).time(0.23).feedback(0.5).mix(0.4))`,
};
