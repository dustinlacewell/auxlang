import type { TestDefinition } from "../types";

export const polySeqChord: TestDefinition = {
	id: "poly-seq-chord",
	category: "Polyphony",
	name: "sequenced chords (comma syntax)",
	desc: "Comma stacks notes into chords - c4,e4,g4 plays simultaneously",
	code: `clock(100)
  .seq("{a3,c4,e4} {g3,b3,d4} {f3,a3,c4} {e3,g3,b3}")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1200 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.2,
          sustain: 0.3,
          release: 0.2
        })
      })
      .gain(0.12)
      .out()
  )`,
};
