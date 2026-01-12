import type { TestDefinition } from "../types";

export const lambdaInlineLfo: TestDefinition = {
	id: "lambda-inline-lfo",
	category: "Inline",
	name: "inline LFO",
	desc: "Lambda function as filter cutoff modulation",
	code: `// Inline sine LFO controlling filter cutoff
// The lambda receives (state, sampleRate, time) - time is seconds since start
saw(220)
  .lpf({
    cutoff: (s, sr, t) => {
      // 2Hz LFO using time parameter directly
      return Math.sin(t * 2 * Math.PI * 2) * 800 + 1000
    }
  })
  .gain(0.3)
  .out()`,
};
