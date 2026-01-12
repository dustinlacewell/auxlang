import type { TestDefinition } from "../types";

export const mathDiv: TestDefinition = {
	id: "math-div",
	category: "Math",
	name: "div - signal division",
	desc: "Envelope divided for gentler decay curve",
	code: `clock(80)
  .seq("c4 e4 g4 c5")
  .apply(s => {
    let e = s.gate.env({
      attack: 0.01,
      release: 0.8
    })
    s.osc()
      .mult({
        by: e
          .add({ to: 1 })
          .div({ by: 2 })
      })
      .out()
  })`,
};
