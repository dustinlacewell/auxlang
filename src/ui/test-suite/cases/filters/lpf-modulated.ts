import type { TestDefinition } from "../types";

export const lpfModulated: TestDefinition = {
	id: "lpf-modulated",
	category: "Filters",
	name: "lpf - modulated",
	desc: "LFO on cutoff - wah-wah effect",
	code: `let cut = lfo(2).min(300).max(2000)
return out(gain(lpf(saw(110)).cutoff(cut).resonance(0.4)).amount(0.25))`,
};
