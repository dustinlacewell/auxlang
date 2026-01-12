import type { TestDefinition } from "../types";

export const delayEcho: TestDefinition = {
	id: "delay-echo",
	category: "Effects",
	name: "delay - echo",
	desc: "Digital delay with feedback for repeating echoes",
	code: `clock(130)
  .seq("e4 g4 a4 b4")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1500 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.2,
          release: 0.1
        })
      })
      .delay({
        time: 0.23,
        feedback: 0.5,
        mix: 0.4
      })
      .out()
  )`,
};
