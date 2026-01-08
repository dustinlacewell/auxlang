import type { TestDefinition } from "../types";

export const lpfModulated: TestDefinition = {
	id: "lpf-modulated",
	category: "Filters",
	name: "lpf - modulated",
	desc: "Lowpass with LFO modulation - filter sweep",
	code: `let freq = scale(lfo(2)).min(200).max(2000)
return out(gain(lpf(saw(55)).cutoff(freq).resonance(0.7)).amount(0.3))`,
};
