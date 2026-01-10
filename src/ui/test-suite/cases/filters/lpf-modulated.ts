import type { TestDefinition } from "../types";

export const lpfModulated: TestDefinition = {
	id: "lpf-modulated",
	category: "Filters",
	name: "lpf - modulated",
	desc: "Lowpass with LFO modulation - filter sweep",
	code: `saw(55)
  .lpf({
    cutoff: lfo(2).min(200).max(2000),
    resonance: 0.7
  })
  .gain({ level: 0.3 })
  .out()`,
};
