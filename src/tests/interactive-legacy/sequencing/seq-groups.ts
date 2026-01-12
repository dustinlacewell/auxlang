import type { TestDefinition } from "../types";

export const seqGroups: TestDefinition = {
	id: "seq-groups",
	category: "Sequencer",
	name: "seq - groups []",
	desc: "Brackets subdivide time - [a b] fits two notes in one step",
	code: `clock(130)
  .seq("e4 [e4 e4] f4 g4 [g4 f4] e4 d4")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 2000 })
      .gain({
        level: s.gate.adsr({
          attack: 0.005,
          decay: 0.08,
          sustain: 0.3,
          release: 0.05
        })
      })
      .out()
  )`,
};
