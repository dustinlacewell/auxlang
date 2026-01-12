import type { TestDefinition } from "../types";

export const polyArrayWrap: TestDefinition = {
	id: "poly-array-wrap",
	category: "Polyphony",
	name: "short array wraps around",
	desc: "2 gain values cycle across 4 voices - alternating loud/quiet",
	code: `// 4 voices but only 2 gain values
// Pattern wraps: loud, quiet, loud, quiet
saw([220, 277.18, 329.63, 440])
  .lpf({ cutoff: 1200 })
  .gain({ level: [0.25, 0.08] })
  .out()`,
};
