import type { TestDefinition } from "../types";

export const drumsKit: TestDefinition = {
	id: "drums-kit",
	category: "Drums",
	name: "drum kit combined",
	desc: "All drums together - full beat",
	code: `let clk = clock(120)
let k = seq("c1 ~ ~ c1 c1 ~ ~ ~").trig(clk.trig)
let s = seq("~ ~ c1 ~ ~ ~ c1 ~").trig(clk.trig)
let h = seq("c1 c1 c1 c1 c1 c1 c1 c1").trig(clk.trig)
let drums = mix(kick(k.gate)).b(snare(s.gate)).c(gain(hihat(h.gate).decay(0.04)).amount(0.3))
return out(gain(drums).amount(0.7))`,
};
