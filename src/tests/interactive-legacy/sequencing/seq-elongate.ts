import type { TestDefinition } from "../types";

export const seqElongate: TestDefinition = {
	id: "seq-elongate",
	category: "Sequencer",
	name: "seq - elongate (@)",
	desc: "At-sign holds note duration - c4@3 sustains for 3 steps",
	code: `clock(130)
  .seq("c4@2 d4 e4@3 d4 c4")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1200 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.2,
          sustain: 0.7,
          release: 0.3
        })
      })
      .out()
  )`,
};
