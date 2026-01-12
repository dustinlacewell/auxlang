import type { TestDefinition } from "../types";

export const drumsKit: TestDefinition = {
	id: "drums-kit",
	category: "Drums",
	name: "drum kit combined",
	desc: "All drums together - full beat",
	code: `clock(120)
  .apply(c => {
    c.seq("c4 ~ c4 ~").trig.kick().out()
    c.seq("~ c4 ~ c4").trig.snare().out()
    c.seq("c4*4").trig.hihat().gain(0.4).out()
  })`,
};
