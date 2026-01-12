import type { TestDefinition } from "../types";

export const seqAlternation: TestDefinition = {
	id: "seq-alternation",
	category: "Sequencer",
	name: "seq - alternation (<>)",
	desc: "Angle brackets cycle through options each pattern loop",
	code: `clock(160)
  .seq("c4 <e4 eb4> g4 <e4 f4>")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1500 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.15,
          sustain: 0.4,
          release: 0.1
        })
      })
      .out()
  )`,
};
