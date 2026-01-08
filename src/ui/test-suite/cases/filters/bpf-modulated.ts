import type { TestDefinition } from "../types";

export const bpfModulated: TestDefinition = {
	id: "bpf-modulated",
	category: "Filters",
	name: "bpf - modulated",
	desc: "Bandpass with LFO modulation - wah effect",
	code: `let freq = scale(lfo(2)).min(200).max(2000)
return out(gain(bpf(saw(55)).cutoff(freq).resonance(0.7)).amount(0.4))`,
};
