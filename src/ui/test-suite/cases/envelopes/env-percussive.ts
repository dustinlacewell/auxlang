import type { TestDefinition } from "../types";

export const envPercussive: TestDefinition = {
	id: "env-percussive",
	category: "Envelopes",
	name: "adsr - percussive",
	desc: "Fast attack, medium decay, no sustain - pluck/perc character",
	code: `clock(130)
  .seq("c4 e4 g4 c5 g4 e4 c4 g3")
  .apply(s =>
    s.osc()
      .gain({
        level: s.gate.adsr({
          attack: 0.002,
          decay: 0.2,
          sustain: 0,
          release: 0.1
        })
      })
      .out()
  )`,
};
