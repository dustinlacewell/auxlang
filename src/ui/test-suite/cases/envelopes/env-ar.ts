import type { TestDefinition } from "../types";

export const envAr: TestDefinition = {
	id: "env-ar",
	category: "Envelopes",
	name: "env (AR)",
	desc: "Simple attack-release envelope with slow swell",
	code: `let clk = clock(50)
let s = seq("c4 g4").trig(clk.trig)
let e = env(s.gate).attack(0.3).release(0.5)
return out(mult(osc(s.cv)).by(e.out))`,
};
