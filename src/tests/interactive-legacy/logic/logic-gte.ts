import type { TestDefinition } from "../types";

export const logicGte: TestDefinition = {
	id: "logic-gte",
	category: "Logic",
	name: "gte - gate drums",
	desc: "Drums start after beat 4",
	code: `clock(120)
  .apply(c =>
    c.seq("c1")
      .apply(s =>
        kick(s.gate)
          .mult({
            by: counter(c)
              .max(8)
              .count
              .gte({ than: 4 })
          })
          .out()
      )
  )`,
};
