import type { TestDefinition } from "../types";

export const polyChord7th: TestDefinition = {
	id: "poly-chord-7th",
	category: "Polyphony",
	name: "static chord (4 voices)",
	desc: "C major 7th - 4 voices summed to mono",
	code: `// Four pitches = 4 poly channels, auto-summed at output
// C4, E4, G4, B4
saw([261.63, 329.63, 392.00, 493.88])
  .lpf({ cutoff: 1200 })
  .gain(0.12)
  .out()`,
};
