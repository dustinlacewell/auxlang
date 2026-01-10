import type { TestDefinition } from "../types";

export const polyChordStatic: TestDefinition = {
	id: "poly-chord-static",
	category: "Polyphony",
	name: "static chord (3 voices)",
	desc: "C major triad - 3 saws playing simultaneously",
	code: `// Three pitches as array input = 3 poly channels
// C4, E4, G4
saw([261.63, 329.63, 392.00])
  .lpf({ cutoff: 1500 })
  .gain({ level: 0.15 })
  .out()`,
};
