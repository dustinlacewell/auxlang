import type { TestDefinition } from "../types";

export const timeClockSwing: TestDefinition = {
	id: "time-clock-swing",
	category: "Timing",
	name: "clock - swing",
	desc: "Clock with swing - shuffled feel",
	code: `let clk = clock(120).swing(0.3)
seq("c4*2", { clk }).trig.hihat({ decay: 0.05 }).out()`,
};
