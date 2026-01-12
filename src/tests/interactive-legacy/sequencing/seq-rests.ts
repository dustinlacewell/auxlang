import type { TestDefinition } from "../types";

export const seqRests: TestDefinition = {
	id: "seq-rests",
	category: "Sequencer",
	name: "seq - rests (~)",
	desc: "Tilde creates silence - compare 'c4 ~ e4 ~' vs 'c4 e4'",
	code: `clock(120)
  .seq("c4 ~ e4 ~ g4 ~ e4 ~")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1500 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.1
        })
      })
      .out()
  )`,
};
