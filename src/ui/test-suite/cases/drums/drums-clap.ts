import type { TestDefinition } from "../types";

export const drumsClap: TestDefinition = {
	id: "drums-clap",
	category: "Drums",
	name: "clap",
	desc: "808-style clap - layered snappy sound",
	code: `let clk = clock(120)
let seq1 = seq("~ c1 ~ c1").clk(clk.trig)
return out(clap(seq1.gate).decay(0.2))`,
};
