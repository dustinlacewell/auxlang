import type { TestDefinition } from "../types";

export const seqMaybeProb: TestDefinition = {
	id: "seq-maybe-prob",
	category: "Sequencer",
	name: "maybe - custom prob",
	desc: "Custom probability values - ?0.2 = 20%",
	code: `clock(140)
  .seq("c4 e4?0.2 g4?0.8 c5")
  .apply(s =>
    s.osc()
      .gain({
        level: s.gate.env({
          attack: 0.01,
          release: 0.2
        })
      })
      .out()
  )`,
};
