import type { TestDefinition } from "../types";

export const utilGainEnv: TestDefinition = {
	id: "util-gain-env",
	category: "Utilities",
	name: "gain - envelope mod",
	desc: "Envelope modulating gain level - shaped amplitude",
	code: `clock(120)
  .seq("c4 e4 g4")
  .apply(s =>
    s.saw()
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          release: 0.2
        })
      })
      .out()
  )`,
};
