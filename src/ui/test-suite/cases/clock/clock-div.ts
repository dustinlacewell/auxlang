import type { TestDefinition } from "../types";

export const clockDiv: TestDefinition = {
	id: "clock-div",
	category: "Clock",
	name: "clockDiv",
	desc: "Divide clock by 4 - one hit per bar",
	code: `let clk = clock(120)
let bar = clockDiv(clk.trig, 4)
return out(kick(bar.trig).pitch(40).decay(0.5))`,
};
