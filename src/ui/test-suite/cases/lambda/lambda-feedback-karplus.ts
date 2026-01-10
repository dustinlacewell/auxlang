import type { TestDefinition } from "../types";

export const lambdaFeedbackKarplus: TestDefinition = {
	id: "lambda-feedback-karplus",
	category: "Lambda",
	name: "karplus-strong string",
	desc: "Plucked string using noise + filtered feedback",
	code: `// Karplus-Strong synthesis: noise burst into filtered delay loop
let c = clock(120)
let trig = seq("c4 ~ c4 ~ c4 c4 ~ ~", { clk: c }).gate

// Noise burst filtered through feedback loop
noise()
  .mult(trig.env({ attack: 0.001, release: 0.01 }))
  .add(x => x.delay({ time: 1/220, mix: 1, feedback: 0 }).lpf({ cutoff: 3000 }).mult({ by: 0.995 }))
  .gain({ level: 0.5 })
  .out()`,
};
