import type { TestDefinition } from "../types";

export const seqMultiply: TestDefinition = {
	id: "seq-multiply",
	category: "Sequencer",
	name: "seq - multiply (*)",
	desc: "Asterisk repeats a note - c4*4 plays four c4s in one step",
	code: `clock(110)
  .seq("a4*2 g4 f4 e4*3 d4")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 2000 })
      .gain({
        level: s.gate.adsr({
          attack: 0.005,
          decay: 0.05,
          sustain: 0.3,
          release: 0.02
        })
      })
      .out()
  )`,
};
