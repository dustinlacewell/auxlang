import type { TestDefinition } from "../types";

export const timeClock: TestDefinition = {
	id: "time-clock",
	category: "Timing",
	name: "clock",
	desc: "Clock at 120 BPM - steady beat",
	code: `clock(120)
  .seq("c4")
  .trig
  .kick()
  .out()`,
};
