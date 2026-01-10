import type { TestDefinition } from "../types";

export const timeClockMult: TestDefinition = {
	id: "time-clock-mult",
	category: "Timing",
	name: "clockMult",
	desc: "Multiply clock by 2 - double time hihats",
	code: `clock(120)
  .trig
  .clockMult({ by: 2 })
  .hihat()
  .decay(0.03)
  .out()`,
};
