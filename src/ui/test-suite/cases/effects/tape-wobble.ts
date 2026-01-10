import type { TestDefinition } from "../types";

export const tapeWobble: TestDefinition = {
	id: "tape-wobble",
	category: "Effects",
	name: "tape - wobble",
	desc: "Tape delay with wow/flutter modulation on repeats",
	code: `clock(110)
  .seq("a4 g4 e4 d4 c4")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1200 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.2
        })
      })
      .tape({
        time: 0.35,
        feedback: 0.4,
        wow: 0.4,
        flutter: 0.2,
        saturation: 0.2,
        tone: 0.6,
        mix: 0.4
      })
      .out()
  )`,
};
