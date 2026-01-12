import type { TestDefinition } from "../types";

export const srcLfoVibrato: TestDefinition = {
	id: "src-lfo-vibrato",
	category: "Sources",
	name: "lfo - vibrato",
	desc: "Fast LFO for vibrato effect",
	code: `osc(add(440).to(mult(lfo(6)).by(15))).gain(0.3).out()`,
};
