import type { TestDefinition } from "../types";

export const mathSub: TestDefinition = {
	id: "math-sub",
	category: "Math",
	name: "sub - inverted envelope",
	desc: "Envelope subtracted from 1 for filter sweep down",
	code: `clock(100)
  .seq("c3 ~ e3 ~ g3 ~ e3 ~")
  .apply(s => {
    let e = s.gate.env({
      attack: 0.01,
      release: 0.3
    })
    let cutoff = sub(e)
      .from(1)
      .mult({ by: 3000 })
      .add({ to: 500 })
    s.saw()
      .lpf({
        cutoff,
        resonance: 0.4
      })
      .mult({ by: e })
      .out()
  })`,
};
