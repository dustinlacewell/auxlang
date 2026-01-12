import type { TestDefinition } from "../types";

export const timeClockDiv: TestDefinition = {
	id: "time-clock-div",
	category: "Timing",
	name: "clockDiv",
	desc: "Divide clock by 4 - one hit per bar",
	code: `clock(120)
  .trig
  .clockDiv({ by: 4 })
  .kick()
  .out()`,
};
