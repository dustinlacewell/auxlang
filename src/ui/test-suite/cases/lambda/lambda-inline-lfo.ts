import type { TestDefinition } from "../types";

export const lambdaInlineLfo: TestDefinition = {
	id: "lambda-inline-lfo",
	category: "Inline",
	name: "inline LFO",
	desc: "Lambda function as filter cutoff modulation",
	code: `// Inline sine LFO controlling filter cutoff
// The lambda receives (state, sampleRate) and returns a number
saw(220).lpf({
  cutoff: (s, sr) => {
    s.phase = ((s.phase ?? 0) + 2 / sr) % 1
    return Math.sin(s.phase * Math.PI * 2) * 800 + 1000
  }
}).gain({ level: 0.3 }).out()`,
};
