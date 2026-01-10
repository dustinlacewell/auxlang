import type { TestDefinition } from "../types";

export const mathSub: TestDefinition = {
	id: "math-sub",
	category: "Math",
	name: "sub - inverted envelope",
	desc: "Envelope subtracted from 1 for filter sweep down",
	code: `let clk = clock(100)
let s = seq("c3 ~ e3 ~ g3 ~ e3 ~", { clk })
let e = s.gate.env({ attack: 0.01, release: 0.3 })
let invEnv = sub(e).from(1)
let cutoff = invEnv.mult({ by: 3000 }).add({ to: 500 })
s.saw()
  .lpf({ cutoff, resonance: 0.4 })
  .mult({ by: e })
  .out()`,
};
