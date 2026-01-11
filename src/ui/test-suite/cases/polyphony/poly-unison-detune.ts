import type { TestDefinition } from "../types";

export const polyUnisonDetune: TestDefinition = {
	id: "poly-unison-detune",
	category: "Polyphony",
	name: "detuned unison (4 voices)",
	desc: "4 slightly detuned saws - thick supersaw",
	code: `// Detuned frequencies for thick unison
let f = 220
saw([f * 0.995, f, f * 1.005, f * 1.01])
  .lpf({ cutoff: 2000 })
  .gain(0.12)
  .out()`,
};
