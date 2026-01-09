import type { TestDefinition } from "../types";

export const envPercussive: TestDefinition = {
	id: "env-percussive",
	category: "Envelopes",
	name: "adsr - percussive (zero sustain)",
	desc: "Fast attack, medium decay, no sustain - pluck/perc character",
	code: `let clk = clock(130)
let s = seq("c4 e4 g4 c5 g4 e4 c4 g3").clk(clk.trig)
let e = adsr(s.gate).attack(0.002).decay(0.2).sustain(0).release(0.1)
return out(mult(osc(s.cv)).by(e.out))`,
};
