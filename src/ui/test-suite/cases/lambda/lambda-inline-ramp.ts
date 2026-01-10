import type { TestDefinition } from "../types";

export const lambdaInlineRamp: TestDefinition = {
	id: "lambda-inline-ramp",
	category: "Inline",
	name: "inline ramp",
	desc: "Lambda generates rising pitch ramp",
	code: `// Pitch ramp using time parameter
// Ramps from 200Hz to 800Hz over ~2 seconds, then resets
saw((s, sr, t) => {
  const cycleT = t % 2  // Reset every 2 seconds
  return 200 + (cycleT / 2) * 600
})
  .lpf({ cutoff: 1500 })
  .gain({ level: 0.3 })
  .out()`,
};
