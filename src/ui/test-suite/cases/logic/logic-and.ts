import type { TestDefinition } from "../types";

export const logicAnd: TestDefinition = {
	id: "logic-and",
	category: "Logic",
	name: "and - range gate",
	desc: "Sound only in beats 2-5",
	code: `clock(120)
  .apply(c => {
    let cnt = counter(c).max(8).count
    let inRange = cnt
      .gte({ than: 2 })
      .and({ with: cnt.lt({ than: 6 }) })
    c.seq("c4")
      .apply(s =>
        s.saw()
          .mult({
            by: s.gate.adsr({
              attack: 0.01,
              decay: 0.15,
              sustain: 0.4,
              release: 0.1
            })
          })
          .mult({ by: inRange })
          .out()
      )
  })`,
};
