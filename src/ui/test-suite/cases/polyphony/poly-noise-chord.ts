import type { TestDefinition } from "../types";

export const polyNoiseChord: TestDefinition = {
	id: "poly-noise-chord",
	category: "Polyphony",
	name: "filtered noise chord",
	desc: "3 bandpass-filtered noise - eerie chord",
	code: `// Each noise channel filtered at different freq
// (This works because each channel has independent filter state)
noise()
  .lpf({ cutoff: [400, 600, 800], resonance: 0.9 })
  .gain({ level: 0.2 })
  .out()`,
};
