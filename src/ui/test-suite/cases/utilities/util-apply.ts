import type { TestDefinition } from "../types";

export const utilApply: TestDefinition = {
	id: "util-apply",
	category: "Utilities",
	name: "apply - inline binding",
	desc: "Capture variable inline to use in multiple places",
	code: `// apply() lets you capture a reference without separate let
// Here we use the clock for both seq timing and envelope trigger
clock(120).apply(c =>
  seq("c4 e4 g4 b4", { clk: c })
    .saw()
    .lpf({ cutoff: 1200 })
    .gain({ level: c.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.2 }) })
).out()`,
};
