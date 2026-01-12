import type { TestDefinition } from "../types";

export const polyArrayGain: TestDefinition = {
	id: "poly-array-gain",
	category: "Polyphony",
	name: "per-voice amplitude",
	desc: "Different volumes per voice - root is loudest",
	code: `// Root note louder, upper voices quieter
// Creates a natural voicing balance
saw([130.81, 261.63, 329.63, 392.00])
  .lpf({ cutoff: 2000 })
  .gain({ level: [0.2, 0.12, 0.1, 0.08] })
  .out()`,
};
