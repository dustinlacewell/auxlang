import type { TestDefinition } from "../types";

export const drumsKick: TestDefinition = {
	id: "drums-kick",
	category: "Drums",
	name: "kick",
	desc: "808-style kick drum - deep thump",
	code: `let clk = clock(120)
let seq1 = seq("c1 c1 c1 c1").trig(clk.trig)
return out(kick(seq1.gate).pitch(50).decay(0.3).sweep(3))`,
};
