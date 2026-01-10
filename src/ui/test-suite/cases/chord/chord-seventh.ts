import type { TestDefinition } from "../types";

export const chordSeventh: TestDefinition = {
	id: "chord-seventh",
	category: "Chord",
	name: "major seventh",
	desc: "Lush major seventh chord",
	code: `// C major seventh
chord(261.63, "maj7")
  .sin()
  .gain({ level: 0.2 })
  .reverb({ mix: 0.4 })
  .out()`,
};
