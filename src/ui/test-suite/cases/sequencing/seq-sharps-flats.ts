import type { TestDefinition } from "../types";

export const seqSharpsFlats: TestDefinition = {
	id: "seq-sharps-flats",
	category: "Sequencing",
	name: "seq - sharps/flats",
	desc: "c#4 db4 f#4 gb4 - chromatic",
	code: `let clk = clock(120)
let s = seq("c#4 db4 f#4 gb4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.4).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1800)).by(env1.out))`,
};
