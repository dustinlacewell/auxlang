import type { TestDefinition } from "../types";

export const timeCounter: TestDefinition = {
	id: "time-counter",
	category: "Timing",
	name: "counter",
	desc: "Count 0-3 then wrap - pitch rises each beat",
	code: `clock(120)
  .trig
  .counter({ max: 4 })
  .count
  .mult({ by: 100 })
  .add({ to: 200 })
  .osc()
  .gain(0.3)
  .out()`,
};
