import type { TestDefinition } from "../types";

export const tapeSaturated: TestDefinition = {
	id: "tape-saturated",
	category: "Effects",
	name: "tape - saturated",
	desc: "Crunchy power chords through saturated tape",
	code: `clock(100)
  .seq("{e2,b2}*2 {e2,b2} {e2,b2} {a2,e3}*2 {a2,e3} {g2,d3} {e2,b2}*4")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 800 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.8,
          release: 0.2
        })
      })
      .tape({
        time: 0.25,
        feedback: 0.5,
        saturation: 0.8,
        tone: 0.35,
        wow: 0.1,
        mix: 0.4
      })
      .out()
  )`,
};
