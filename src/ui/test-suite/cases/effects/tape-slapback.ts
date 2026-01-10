import type { TestDefinition } from "../types";

export const tapeSlapback: TestDefinition = {
	id: "tape-slapback",
	category: "Effects",
	name: "tape - slapback",
	desc: "Short tape delay for rockabilly slapback doubling",
	code: `clock(150)
  .seq("e4 e4 e4 d4 c4 c4 d4 e4 d4 c4")
  .apply(s =>
    s.saw()
      .lpf({
        cutoff: 2000,
        resonance: 0.2
      })
      .gain({
        level: s.gate.adsr({
          attack: 0.005,
          decay: 0.15,
          sustain: 0.1,
          release: 0.1
        })
      })
      .tape({
        time: 0.07,
        feedback: 0.2,
        saturation: 0.3,
        tone: 0.7,
        mix: 0.35
      })
      .out()
  )`,
};
