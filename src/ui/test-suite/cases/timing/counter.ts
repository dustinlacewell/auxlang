import type { TestDefinition } from "../types";

export const timeCounter: TestDefinition = {
	id: "time-counter",
	category: "Timing",
	name: "counter",
	desc: "Count 0-3 then wrap - pitch rises each beat",
	code: `let clk = clock(120)
let cnt = clk.trig.counter({ max: 4 })
cnt.count.mult({ by: 100 }).add({ to: 200 }).osc().gain({ level: 0.3 }).out()`,
};
