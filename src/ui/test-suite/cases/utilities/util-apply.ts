import type { TestDefinition } from "../types";

export const utilApply: TestDefinition = {
	id: "util-apply",
	category: "Utilities",
	name: "apply - inline binding",
	desc: "Capture variable inline to use in multiple places",
	code: `// apply() captures a reference inline for reuse
clock(120)
  .seq("c4 e4 g4 b4")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 1200 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.2,
          sustain: 0.3,
          release: 0.2
        })
      })
      .out()
  )`,
};
