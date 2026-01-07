import type { TestDefinition } from "../types";

export const oscNoise: TestDefinition = {
	id: "osc-noise",
	category: "Oscillators",
	name: "noise",
	desc: "White noise - hissy, all frequencies",
	code: `return out(gain(noise()).amount(0.15))`,
};
