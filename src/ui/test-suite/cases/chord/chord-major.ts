import type { TestDefinition } from "../types";

export const chordMajor: TestDefinition = {
	id: "chord-major",
	category: "Chord",
	name: "major triad",
	desc: "Static C major chord - root, third, fifth",
	code: `// C major triad
chord(261.63, "maj")
  .saw()
  .lpf({ cutoff: 1200 })
  .gain({ level: 0.2 })
  .out()`,
};
