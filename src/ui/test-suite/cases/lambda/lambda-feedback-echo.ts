import type { TestDefinition } from "../types";

export const lambdaFeedbackEcho: TestDefinition = {
	id: "lambda-feedback-echo",
	category: "Lambda",
	name: "feedback echo",
	desc: "Classic delay echo with decaying repeats",
	code: `// Feedback delay creates echoing repeats
let c = clock(60)
let s = seq("c4 ~ ~ ~", { clk: c })
s.saw()
  .lpf({ cutoff: 2000 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }) })
  .add(x => x.delay({ time: 0.3, mix: 1, feedback: 0 }).mult({ by: 0.6 }))
  .gain({ level: 0.4 })
  .out()`,
};
