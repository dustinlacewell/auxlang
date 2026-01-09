import type { TestDefinition } from "../types";

export const logicEq: TestDefinition = {
	id: "logic-eq",
	category: "Logic",
	name: "eq - equals comparison",
	desc: "Accent on every 4th beat (count equals 0 mod 4)",
	code: `let clk = clock(140)
let cnt = counter(clk.trig)
let beat4 = eq(mod(cnt.count).by(4)).to(0)
let accentGain = add(mult(beat4).by(0.3)).to(0.7)
let s = seq("c3 e3 g3 c4").clk(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(mult(lpf(saw(s.cv)).cutoff(1500)).by(e.out)).by(accentGain))`,
};
