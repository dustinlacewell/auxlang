import type { TestDefinition } from "../types";

export const logicEq: TestDefinition = {
	id: "logic-eq",
	category: "Logic",
	name: "eq - equals comparison",
	desc: "Accent on every 4th beat (count equals 0 mod 4)",
	code: `clock(140)
  .apply(c => {
    let accent = counter(c).count
      .mod({ by: 4 })
      .eq({ to: 0 })
      .mult({ by: 0.3 })
      .add({ to: 0.7 })
    c.seq("c3 e3 g3 c4")
      .apply(s =>
        s.saw()
          .lpf({ cutoff: 1500 })
          .mult({
            by: s.gate.adsr({
              attack: 0.01,
              decay: 0.1,
              sustain: 0.3,
              release: 0.1
            })
          })
          .mult({ by: accent })
          .out()
      )
  })`,
};
