import type { TestDefinition } from "../types";

export const clock60: TestDefinition = {
	id: "clock-60",
	category: "Clock",
	name: "clock - 60 BPM",
	desc: "Slow tempo - one beat per second",
	code: `let clk = clock(60)
let s = seq("c4").trig(clk.trig)
return out(kick(s.gate))`,
};
