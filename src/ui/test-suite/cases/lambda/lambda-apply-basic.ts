import type { TestDefinition } from "../types";

export const lambdaApplyBasic: TestDefinition = {
	id: "lambda-apply-basic",
	category: "Lambda",
	name: "apply for binding",
	desc: "Use .apply() to bind a signal for multiple uses",
	code: `// .apply() lets you name a signal and use it multiple times
// Here we bind the clock so both seq and the modulation can use it
clock(120).apply(c =>
  seq("c4 e4 g4 c5", { clk: c }).apply(s =>
    s.saw()
      .lpf({ cutoff: 1200 })
      .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 }) })
      .gain({ level: 0.3 })
      .out()
  )
)`,
};
