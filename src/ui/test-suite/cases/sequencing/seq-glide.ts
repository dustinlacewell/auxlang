import type { TestDefinition } from "../types";

export const seqGlide: TestDefinition = {
	id: "seq-glide",
	category: "Sequencing",
	name: "seq - glide (_)",
	desc: "c3_g3 ~ e3_c4 - legato phrases with gap",
	code: `let clk = clock(120)
let s = seq("c3_g3 ~ e3_c4").trig(clk.trig)
let smoothPitch = slew(s.cv).rise(0.01).fall(0)
let e = adsr(s.gate).attack(0.5).decay(0.1).sustain(0.35).release(0.05)
return out(mult(lpf(saw(smoothPitch)).cutoff(1200)).by(e.out))`,
};
