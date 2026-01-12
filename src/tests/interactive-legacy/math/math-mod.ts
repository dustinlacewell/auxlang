import type { TestDefinition } from "../types";

export const mathMod: TestDefinition = {
	id: "math-mod",
	category: "Math",
	name: "mod - modulo wrap",
	desc: "Counter modulo creates repeating 4-step cutoff pattern",
	code: `clock(140)
  .apply(c =>
    c.seq("c3 c3 g3 c3")
      .apply(s =>
        s.saw()
          .lpf({
            cutoff: counter(c).count
              .mod({ by: 4 })
              .mult({ by: 400 })
              .add({ to: 400 }),
            resonance: 0.3
          })
          .mult({
            by: s.gate.adsr({
              attack: 0.01,
              decay: 0.1,
              sustain: 0.3,
              release: 0.1
            })
          })
          .out()
      )
  )`,
};
