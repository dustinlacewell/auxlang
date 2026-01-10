import type { TestDefinition } from "../types";

export const bpfModulated: TestDefinition = {
	id: "bpf-modulated",
	category: "Filters",
	name: "bpf - modulated",
	desc: "Bandpass with LFO modulation - wah effect",
	code: `saw(55)
  .bpf({ cutoff: lfo(2).min(200).max(2000), resonance: 0.7 })
  .gain({ level: 0.4 })
  .out()`,
};
