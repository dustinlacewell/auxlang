import type { TestDefinition } from "../types";

export const polyBroadcastFilter: TestDefinition = {
	id: "poly-broadcast-filter",
	category: "Polyphony",
	name: "mono cutoff → poly signal",
	desc: "Single LFO controls filter on all 3 voices",
	code: `// Poly signal + mono modulation = mono broadcasts to all channels
let cut = lfo(0.5).min(400).max(2000)  // mono LFO
saw([261.63, 329.63, 392.00])
  .lpf({ cutoff: cut })
  .gain(0.15)
  .out()`,
};
