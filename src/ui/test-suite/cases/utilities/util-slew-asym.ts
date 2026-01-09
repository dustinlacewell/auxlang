import type { TestDefinition } from "../types";

export const utilSlewAsym: TestDefinition = {
	id: "util-slew-asym",
	category: "Utilities",
	name: "slew - asymmetric rise/fall",
	desc: "Fast attack, slow decay on filter - punchy with long tail",
	code: `let clk = clock(120)
let s = seq("c3 e3").clk(clk.trig)
let e = env(s.gate).attack(0.001).release(0.05)
let cutoffEnv = slew(mult(e.out).by(3000)).rise(0.01).fall(0.8)
let cutoff = add(cutoffEnv).to(200)
let vol = env(s.gate).attack(0.01).release(0.6)
return out(mult(lpf(saw(s.cv)).cutoff(cutoff).resonance(0.4)).by(vol.out))`,
};
