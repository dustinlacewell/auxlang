import type { TestDefinition } from "../types";

export const oscLfoPitch: TestDefinition = {
	id: "osc-lfo-pitch",
	category: "Oscillators",
	name: "lfo → pitch",
	desc: "Sine with vibrato - pitch should wobble",
	code: `let freq = add(440).to(mult(lfo(5)).by(20))
return out(gain(osc(freq)).amount(0.3))`,
};
