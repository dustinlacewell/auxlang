import type { TestDefinition } from "../types";

export const hpfModulated: TestDefinition = {
	id: "hpf-modulated",
	category: "Filters",
	name: "hpf - modulated",
	desc: "Highpass with LFO modulation - filter sweep",
	code: `saw(55)
  .hpf({
    cutoff: lfo(2).min(200).max(2000),
    resonance: 0.7
  })
  .gain({ level: 0.3 })
  .out()`,
};
