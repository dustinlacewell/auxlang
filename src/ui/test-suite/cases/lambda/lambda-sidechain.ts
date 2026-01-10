import type { TestDefinition } from "../types";

export const lambdaSidechain: TestDefinition = {
	id: "lambda-sidechain",
	category: "Apply",
	name: "sidechain compression",
	desc: "Use apply to route kick to duck the pad",
	code: `// Kick signal used to duck the pad volume
clock(120)
  .seq("c2 ~ ~ ~")
  .apply(kickSeq => {
    // Pad plays continuously but ducks when kick hits
    saw(110)
      .lpf({ cutoff: 600 })
      .gain({ level: 0.4 })
      // Invert kick envelope to create ducking (1 - env)
      .mult({
        by: kickSeq.gate
          .env({ attack: 0.01, release: 0.15 })
          .inv()
          .add(1)
          .mult({ by: 0.5 })
      })
      // Mix with the actual kick
      .add(kick(kickSeq.gate).mult({ by: 0.6 }))
      .gain({ level: 0.4 })
      .out()
  })`,
};
