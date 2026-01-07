import type { TestDefinition } from "../types";

export const oscSaw: TestDefinition = {
	id: "osc-saw",
	category: "Oscillators",
	name: "saw",
	desc: "Sawtooth wave at 220Hz - bright, buzzy",
	code: `return out(gain(saw(220)).amount(0.2))`,
};
