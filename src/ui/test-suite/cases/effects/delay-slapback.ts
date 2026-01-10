import type { TestDefinition } from "../types";

export const delaySlapback: TestDefinition = {
	id: "delay-slapback",
	category: "Effects",
	name: "delay - slapback",
	desc: "Short delay, no feedback - classic slapback echo",
	code: `let clk = clock(110)
let s = seq("g3 ~ a3 b3 c4 ~ b3 a3", { clk })
s
  .saw()
  .lpf({ cutoff: 1200 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }) })
  .delay({ time: 0.08, feedback: 0.1, mix: 0.35 })
  .out()`,
};
