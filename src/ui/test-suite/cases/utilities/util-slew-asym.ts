import type { TestDefinition } from "../types";

export const utilSlewAsym: TestDefinition = {
	id: "util-slew-asym",
	category: "Utilities",
	name: "slew - asymmetric rise/fall",
	desc: "Fast attack, slow decay on filter - punchy with long tail",
	code: `clock(120)
  .seq("c3 e3")
  .apply(s => {
    let cutoff = s.gate
      .env({ attack: 0.001, release: 0.05 })
      .mult({ by: 3000 })
      .slew({ rise: 0.01, fall: 0.8 })
      .add({ to: 200 })
    s.saw()
      .lpf({
        cutoff,
        resonance: 0.4
      })
      .gain({
        level: s.gate.env({
          attack: 0.01,
          release: 0.6
        })
      })
      .out()
  })`,
};
