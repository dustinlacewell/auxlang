import type { TestDefinition } from "../types";

export const utilSlew: TestDefinition = {
	id: "util-slew",
	category: "Utilities",
	name: "slew - portamento",
	desc: "Slew limiter smooths pitch transitions for glide effect",
	code: `clock(80)
  .seq("c3 e3 g3 c4 b3 g3 e3 c3")
  .apply(s =>
    s.cv
      .slew({
        rise: 0.08,
        fall: 0.08
      })
      .saw()
      .lpf({ cutoff: 1000 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.2,
          sustain: 0.6,
          release: 0.2
        })
      })
      .out()
  )`,
};
