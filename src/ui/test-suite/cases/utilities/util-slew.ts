import type { TestDefinition } from "../types";

export const utilSlew: TestDefinition = {
	id: "util-slew",
	category: "Utilities",
	name: "slew - portamento",
	desc: "Slew limiter smooths pitch transitions for glide effect",
	code: `let clk = clock(80)
let s = seq("c3 e3 g3 c4 b3 g3 e3 c3").clk(clk.trig)
let smoothPitch = slew(s.cv).rise(0.08).fall(0.08)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.6).release(0.2)
return out(mult(lpf(saw(smoothPitch)).cutoff(1000)).by(e.out))`,
};
