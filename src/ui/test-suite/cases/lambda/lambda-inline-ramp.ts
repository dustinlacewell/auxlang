import type { TestDefinition } from "../types";

export const lambdaInlineRamp: TestDefinition = {
	id: "lambda-inline-ramp",
	category: "Inline",
	name: "inline ramp",
	desc: "Lambda generates rising pitch ramp",
	code: `// Pitch ramp using inline lambda state
// Ramps from 200Hz to 800Hz over ~2 seconds, then resets
saw((s, sr) => {
  s.t = (s.t ?? 0) + 1 / sr
  if (s.t > 2) s.t = 0
  return 200 + (s.t / 2) * 600
}).lpf({ cutoff: 1500 }).gain({ level: 0.3 }).out()`,
};
