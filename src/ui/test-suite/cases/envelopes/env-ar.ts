import type { TestDefinition } from "../types";

export const envAr: TestDefinition = {
	id: "env-ar",
	category: "Envelopes",
	name: "env (AR)",
	desc: "Attack-Release envelope - ramp up, ramp down",
	code: `let clk = clock(60)
let s = seq("c4 ~ ~ ~").trig(clk.trig)
let e = env(s.gate).attack(0.3).release(0.5)
return out(mult(osc(s.cv)).by(e.out))`,
};
