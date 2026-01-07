import type { TestDefinition } from "../types";

export const utilGain: TestDefinition = {
	id: "util-gain",
	category: "Utilities",
	name: "gain",
	desc: "Volume control - quiet sine",
	code: `return out(gain(osc(440)).amount(0.1))`,
};
