import type { TestDefinition } from "../types";

export const drumsSnare: TestDefinition = {
	id: "drums-snare",
	category: "Drums",
	name: "snare",
	desc: "808-style snare - punchy with noise",
	code: `let clk = clock(120)
let seq1 = seq("~ c1 ~ c1").clk(clk.trig)
return out(snare(seq1.gate).tone(0.5).decay(0.15).snappy(0.5))`,
};
