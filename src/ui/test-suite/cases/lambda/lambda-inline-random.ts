import type { TestDefinition } from "../types";

export const lambdaInlineRandom: TestDefinition = {
	id: "lambda-inline-random",
	category: "Inline",
	name: "inline random",
	desc: "Lambda generates sample-and-hold randomness",
	code: `// Sample-and-hold random filter cutoff
// Updates randomly every ~0.1 seconds
let c = clock(120)
seq("c3 e3 g3 c4", { clk: c })
  .saw()
  .lpf({
    cutoff: (s, sr) => {
      s.timer = (s.timer ?? 0) + 1
      if (s.timer > sr * 0.1) {
        s.timer = 0
        s.value = 400 + Math.random() * 1200
      }
      return s.value ?? 800
    }
  })
  .gain({ level: seq("c3 e3 g3 c4", { clk: c }).gate.adsr({ attack: 0.01, sustain: 0.5, release: 0.2 }) })
  .mult({ by: 0.3 })
  .out()`,
};
