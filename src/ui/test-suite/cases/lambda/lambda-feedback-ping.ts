import type { TestDefinition } from "../types";

export const lambdaFeedbackPing: TestDefinition = {
	id: "lambda-feedback-ping",
	category: "Lambda",
	name: "resonant ping",
	desc: "Impulse into resonant feedback creates pitched ping",
	code: `// Short impulse excites a resonant feedback loop
let c = clock(180)
let trig = seq("c4 ~ e4 ~ g4 ~ c5 ~", { clk: c }).gate

// Impulse into tuned delay loop
noise()
  .mult(trig.env({ attack: 0.001, release: 0.005 }))
  .add(x => x.delay({ time: 0.005, mix: 1, feedback: 0 }).bpf({ cutoff: 800, resonance: 0.9 }).mult({ by: 0.9 }))
  .gain({ level: 0.4 })
  .out()`,
};
