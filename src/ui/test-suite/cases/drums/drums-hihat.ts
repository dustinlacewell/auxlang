import type { TestDefinition } from "../types";

export const drumsHihat: TestDefinition = {
	id: "drums-hihat",
	category: "Drums",
	name: "hihat",
	desc: "808-style hihat - metallic tick",
	code: `let clk = clock(120)
let seq1 = seq("c1 c1 c1 c1 c1 c1 c1 c1").clk(clk.trig)
return out(gain(hihat(seq1.gate).decay(0.05).tone(0.7)).amount(0.5))`,
};
