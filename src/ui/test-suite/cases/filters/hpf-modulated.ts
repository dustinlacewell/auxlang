import type { TestDefinition } from "../types";

export const hpfModulated: TestDefinition = {
	id: "hpf-modulated",
	category: "Filters",
	name: "hpf - modulated",
	desc: "Highpass with LFO modulation - filter sweep",
	code: `let freq = scale(lfo(2)).min(200).max(2000)
return out(gain(hpf(saw(55)).cutoff(freq).resonance(0.7)).amount(0.3))`,
};
