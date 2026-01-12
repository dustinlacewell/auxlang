import type { TestDefinition } from "../types";

export const mathClip: TestDefinition = {
	id: "math-clip",
	category: "Math",
	name: "clip - hard clipping",
	desc: "Saw wave hard-clipped for harsh distortion",
	code: `clock(120)
  .seq("a2 a2 d3 a2")
  .apply(s =>
    s.saw()
      .mult({ by: 3 })
      .clip({
        min: -0.5,
        max: 0.5
      })
      .lpf({ cutoff: 1500 })
      .mult({
        by: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.4,
          release: 0.1
        })
      })
      .out()
  )`,
};
