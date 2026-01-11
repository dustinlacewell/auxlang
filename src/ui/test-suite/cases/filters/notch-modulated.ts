import type { TestDefinition } from "../types";

export const notchModulated: TestDefinition = {
	id: "notch-modulated",
	category: "Filters",
	name: "notch - modulated",
	desc: "Notch with LFO modulation - phaser-like effect",
	code: `noise()
  .notch({
    cutoff: lfo(2).min(200).max(2000),
    resonance: 0.7
  })
  .gain(0.3)
  .out()`,
};
