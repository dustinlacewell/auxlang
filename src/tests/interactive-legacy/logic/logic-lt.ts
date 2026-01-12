import type { TestDefinition } from "../types";

export const logicLt: TestDefinition = {
	id: "logic-lt",
	category: "Logic",
	name: "lt - intro only",
	desc: "Sound only in first 4 beats",
	code: `clock(120)
  .apply(c =>
    c.seq("c4 e4 g4 c5")
      .apply(s =>
        s.saw()
          .mult({
            by: s.gate.adsr({
              attack: 0.01,
              decay: 0.1,
              sustain: 0.3,
              release: 0.1
            })
          })
          .mult({
            by: counter(c)
              .max(8)
              .count
              .lt({ than: 4 })
          })
          .out()
      )
  )`,
};
