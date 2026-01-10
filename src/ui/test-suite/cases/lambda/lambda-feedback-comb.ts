import type { TestDefinition } from "../types";

export const lambdaFeedbackComb: TestDefinition = {
	id: "lambda-feedback-comb",
	category: "Lambda",
	name: "feedback comb filter",
	desc: "Very short delay creates resonant comb filter",
	code: `// Short delay time creates metallic resonance
saw(110)
  .add(x => x.delay({ time: 0.003, mix: 1, feedback: 0 }).mult({ by: 0.85 }))
  .gain({ level: 0.3 })
  .out()`,
};
