import type { TestDefinition } from "../types";

export const envPad: TestDefinition = {
	id: "env-pad",
	category: "Envelopes",
	name: "adsr - pad",
	desc: "Slow attack, high sustain - pad sound",
	code: `let clk = clock(40)
let s = seq("c3 g3").trig(clk.trig)
let e = adsr(s.gate).attack(0.4).decay(0.3).sustain(0.7).release(0.5)
return out(gain(mult(lpf(saw(s.cv)).cutoff(800)).b(e.out)).amount(0.5))`,
};
