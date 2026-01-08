import type { TestDefinition } from "../types";

export const oscLfoFilter: TestDefinition = {
	id: "osc-lfo-filter",
	category: "Oscillators",
	name: "lfo - filter modulation",
	desc: "LFO with min/max range modulating filter cutoff",
	code: `let l = lfo(0.3).min(400).max(2000)
return out(gain(lpf(saw(55)).cutoff(l).resonance(0.5)).amount(0.4))`,
};
