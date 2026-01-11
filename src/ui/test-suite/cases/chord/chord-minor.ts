import type { TestDefinition } from "../types";

export const chordMinor: TestDefinition = {
	id: "chord-minor",
	category: "Chord",
	name: "minor triad",
	desc: "A minor chord - darker, sadder quality",
	code: `// A minor triad
chord(220, "min")
  .tri()
  .lpf({ cutoff: 1000 })
  .gain(0.25)
  .out()`,
};
