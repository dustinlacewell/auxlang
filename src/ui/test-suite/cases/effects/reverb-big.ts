import type { TestDefinition } from "../types";

export const fxReverbBig: TestDefinition = {
	id: "fx-reverb-big",
	category: "Effects",
	name: "reverb - big hall",
	desc: "Large room, long tail",
	code: `clock(60)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.osc()
      .gain({
        level: s.gate.env({
          attack: 0.05,
          release: 0.3
        })
      })
      .reverb({
        room: 0.9,
        wet: 0.5
      })
      .out()
  )`,
};
