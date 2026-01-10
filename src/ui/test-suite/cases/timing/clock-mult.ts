import type { TestDefinition } from "../types";

export const timeClockMult: TestDefinition = {
	id: "time-clock-mult",
	category: "Timing",
	name: "clockMult",
	desc: "Multiply clock by 2 - double time hihats",
	code: `let clk = clock(120)
let doubled = clockMult(clk.trig).by(2)
hihat(doubled).decay(0.03).out()`,
};
