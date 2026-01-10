import type { TestDefinition } from "../types";

export const polyArrayDistribute: TestDefinition = {
	id: "poly-array-distribute",
	category: "Polyphony",
	name: "array distributes to voices",
	desc: "Each voice gets different cutoff - low, mid, high",
	code: `// Array of cutoffs distributes to matching voices
// Voice 0: 400 Hz cutoff (dark)
// Voice 1: 1500 Hz cutoff (mid)
// Voice 2: 4000 Hz cutoff (bright)
saw([130.81, 261.63, 523.25])
  .lpf({ cutoff: [400, 1500, 4000] })
  .gain({ level: 0.15 })
  .out()`,
};
