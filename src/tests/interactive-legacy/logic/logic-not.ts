import type { TestDefinition } from "../types";

export const logicNot: TestDefinition = {
	id: "logic-not",
	category: "Logic",
	name: "not - logical NOT",
	desc: "Snare on every beat EXCEPT beat 1",
	code: `clock(120)
  .apply(c => {
    let notBeat1 = counter(c).count
      .mod({ by: 4 })
      .eq({ to: 0 })
      .not()
    snare(c.trig)
      .mult({
        by: c.trig
          .env({ attack: 0.001, release: 0.15 })
          .mult({ by: notBeat1 })
      })
      .out()
  })`,
};
