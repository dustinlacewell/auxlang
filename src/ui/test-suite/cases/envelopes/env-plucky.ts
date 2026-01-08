import type { TestDefinition } from "../types";

export const envPlucky: TestDefinition = {
	id: "env-plucky",
	category: "Envelopes",
	name: "adsr - plucky",
	desc: "Fast attack, short decay - plucky sound",
	code: `let clk = clock(120)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let e = adsr(s.gate).attack(0.005).decay(0.1).sustain(0.1).release(0.05)
return out(mult(saw(s.cv)).by(e.out))`,
};
