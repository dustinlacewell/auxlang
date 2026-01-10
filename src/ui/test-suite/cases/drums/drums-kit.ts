import type { TestDefinition } from "../types";

export const drumsKit: TestDefinition = {
	id: "drums-kit",
	category: "Drums",
	name: "drum kit combined",
	desc: "All drums together - full beat",
	code: `let c = clock(120)

c.seq("c4 ~ c4 ~").trig.kick({ decay: 0.4 }).out()
c.seq("~ c4 ~ c4").trig.snare({ snappy: 0.6 }).out()
c.seq("c4*4").trig.hihat({ decay: 0.04 }).gain({ level: 0.4 }).out()`,
};
