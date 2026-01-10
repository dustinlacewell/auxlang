import type { TestDefinition } from "../types";

export const timeClockDiv: TestDefinition = {
	id: "time-clock-div",
	category: "Timing",
	name: "clockDiv",
	desc: "Divide clock by 4 - one hit per bar",
	code: `let clk = clock(120)
let divided = clockDiv(clk.trig).by(4)
kick(divided).decay(0.5).out()`,
};
