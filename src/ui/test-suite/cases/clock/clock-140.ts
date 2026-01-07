import type { TestDefinition } from "../types";

export const clock140: TestDefinition = {
	id: "clock-140",
	category: "Clock",
	name: "clock - 140 BPM",
	desc: "Fast tempo - energetic",
	code: `let clk = clock(140)
let s = seq("c4").trig(clk.trig)
return out(kick(s.gate))`,
};
