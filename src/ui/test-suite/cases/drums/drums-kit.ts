import type { TestDefinition } from "../types";

export const drumsKit: TestDefinition = {
	id: "drums-kit",
	category: "Drums",
	name: "drum kit combined",
	desc: "All drums together - full beat",
	code: `let clk = clock(120)

seq("c4 ~ c4 ~", { clk }).trig.kick({ decay: 0.4 }).out()
seq("~ c4 ~ c4", { clk }).trig.snare({ snappy: 0.6 }).out()
seq("c4*4", { clk }).trig.hihat({ decay: 0.04 }).gain({ level: 0.4 }).out()`,
};
