import type { TestDefinition } from "../types";

export const polyUnisonDetune: TestDefinition = {
	id: "poly-unison-detune",
	category: "Polyphony",
	name: "detuned unison (4 voices)",
	desc: "4 slightly detuned saws - thick supersaw",
	code: `// Detuned frequencies for thick unison
let f = 220
let chord = saw([f * 0.995, f, f * 1.005, f * 1.01])
return out(gain(lpf(chord).cutoff(2000)).amount(0.12))`,
};
