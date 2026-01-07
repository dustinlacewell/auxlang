import type { TestDefinition } from "../types";

export const oscLfoPitch: TestDefinition = {
	id: "osc-lfo-pitch",
	category: "Oscillators",
	name: "lfo → pitch",
	desc: "Sine with vibrato - pitch should wobble",
	code: `let freq = add(440).b(mult(lfo(5)).b(20))
return out(gain(osc(freq)).amount(0.3))`,
};
