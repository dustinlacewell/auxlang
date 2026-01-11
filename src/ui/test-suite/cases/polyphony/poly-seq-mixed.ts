import type { TestDefinition } from "../types";

export const polySeqMixed: TestDefinition = {
	id: "poly-seq-mixed",
	category: "Polyphony",
	name: "mixed mono/poly sequence",
	desc: "Single notes and chords in same sequence",
	code: `clock(115)
  .seq("e2 {e3,g#3,b3} e2 {e3,g#3,b3} a2 {a3,c#4,e4} b2 {b3,d#4,f#4}")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1000 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.15,
          sustain: 0.2,
          release: 0.1
        })
      })
      .gain(0.15)
      .out()
  )`,
};
