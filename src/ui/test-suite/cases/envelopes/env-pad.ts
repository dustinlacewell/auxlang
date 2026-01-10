import type { TestDefinition } from "../types";

export const envPad: TestDefinition = {
	id: "env-pad",
	category: "Envelopes",
	name: "adsr - pad",
	desc: "Slow attack, high sustain for ambient pad texture",
	code: `let clk = clock(30)
let s = seq("a3 e3 f3 c3", { clk })
s.saw()
  .lpf({ cutoff: 800 })
  .gain({ level: s.gate.adsr({ attack: 0.4, decay: 0.3, sustain: 0.7, release: 0.5 }) })
  .out()`,
};
