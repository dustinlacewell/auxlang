import type { TestDefinition } from "../types";

export const timeClock: TestDefinition = {
	id: "time-clock",
	category: "Timing",
	name: "clock",
	desc: "Clock at 120 BPM - steady beat",
	code: `let clk = clock(120)
seq("c4", { clk }).trig.kick().out()`,
};
