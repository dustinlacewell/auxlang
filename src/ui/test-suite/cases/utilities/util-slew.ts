import type { TestDefinition } from "../types";

export const utilSlew: TestDefinition = {
	id: "util-slew",
	category: "Utilities",
	name: "slew - portamento",
	desc: "Glide between notes - smooth pitch change",
	code: `let clk = clock(60)
let s = seq("c3 g3 e3 c4").trig(clk.trig)
let smoothPitch = slew(s.cv).rise(0.1).fall(0.1)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.6).release(0.2)
return out(mult(lpf(saw(smoothPitch)).cutoff(1000)).b(e.out))`,
};
