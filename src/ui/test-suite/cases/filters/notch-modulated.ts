import type { TestDefinition } from "../types";

export const notchModulated: TestDefinition = {
	id: "notch-modulated",
	category: "Filters",
	name: "notch - modulated",
	desc: "Notch with LFO modulation - phaser-like effect",
	code: `let freq = scale(lfo(2)).outMin(200).outMax(2000)
return out(gain(notch(noise()).cutoff(freq).resonance(0.7)).amount(0.3))`,
};
