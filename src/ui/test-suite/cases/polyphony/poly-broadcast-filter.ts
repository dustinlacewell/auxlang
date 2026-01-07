import type { TestDefinition } from "../types";

export const polyBroadcastFilter: TestDefinition = {
	id: "poly-broadcast-filter",
	category: "Polyphony",
	name: "mono cutoff → poly signal",
	desc: "Single LFO controls filter on all 3 voices",
	code: `// Poly signal + mono modulation = mono broadcasts to all channels
let chord = saw([261.63, 329.63, 392.00])
let cut = lfo(0.5).min(400).max(2000)  // mono LFO
return out(gain(lpf(chord).cutoff(cut)).amount(0.15))`,
};
