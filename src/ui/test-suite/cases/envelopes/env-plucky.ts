import type { TestDefinition } from "../types";

export const envPlucky: TestDefinition = {
	id: "env-plucky",
	category: "Envelopes",
	name: "adsr - plucky",
	desc: "Fast attack, short decay for plucked string character",
	code: `let clk = clock(160)
let s = seq("d4 a4 d5 a4 g4 f#4 e4 d4").clk(clk.trig)
let e = adsr(s.gate).attack(0.005).decay(0.1).sustain(0.1).release(0.05)
return out(mult(saw(s.cv)).by(e.out))`,
};
