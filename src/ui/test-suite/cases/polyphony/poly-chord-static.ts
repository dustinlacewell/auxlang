import type { TestDefinition } from "../types";

export const polyChordStatic: TestDefinition = {
	id: "poly-chord-static",
	category: "Polyphony",
	name: "static chord (3 voices)",
	desc: "C major triad - 3 saws playing simultaneously",
	code: `// Three pitches as array input = 3 poly channels
let chord = saw([261.63, 329.63, 392.00])  // C4, E4, G4
return out(gain(lpf(chord).cutoff(1500)).amount(0.15))`,
};
