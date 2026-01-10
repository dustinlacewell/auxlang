import type { TestDefinition } from "../types";

export const lambdaInlineBinding: TestDefinition = {
	id: "lambda-inline-binding",
	category: "Apply",
	name: "inline variable binding",
	desc: "Use .apply() to bind variables inline without breaking the chain",
	code: `// .apply(fn) lets you bind intermediate values
// Useful when you need to reference the same signal multiple times
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
