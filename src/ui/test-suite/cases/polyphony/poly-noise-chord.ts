import type { TestDefinition } from "../types";

export const polyNoiseChord: TestDefinition = {
	id: "poly-noise-chord",
	category: "Polyphony",
	name: "filtered noise chord",
	desc: "3 bandpass-filtered noise - eerie chord",
	code: `// Each noise channel filtered at different freq
// (This works because each channel has independent filter state)
let n = noise()
let cut = [400, 600, 800]  // poly cutoff = different filter per channel
return out(gain(lpf(n).cutoff(cut).resonance(0.9)).amount(0.2))`,
};
