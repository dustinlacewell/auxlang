import type { TestDefinition } from "../types";

export const envAr: TestDefinition = {
	id: "env-ar",
	category: "Envelopes",
	name: "env (AR)",
	desc: "Simple attack-release envelope with slow swell",
	code: `clock(50)
  .seq("c4 g4")
  .apply(s =>
    s.osc()
      .gain({
        level: s.gate.env({
          attack: 0.3,
          release: 0.5
        })
      })
      .out()
  )`,
};
