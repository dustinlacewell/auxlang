import type { TestDefinition } from "../types";

export const delaySlapback: TestDefinition = {
	id: "delay-slapback",
	category: "Effects",
	name: "delay - slapback",
	desc: "Short delay, no feedback - classic slapback echo",
	code: `clock(110)
  .seq("g3 ~ a3 b3 c4 ~ b3 a3")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1200 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.1
        })
      })
      .delay({
        time: 0.08,
        feedback: 0.1,
        mix: 0.35
      })
      .out()
  )`,
};
