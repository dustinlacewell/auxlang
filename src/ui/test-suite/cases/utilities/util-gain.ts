import type { TestDefinition } from "../types";

export const utilGain: TestDefinition = {
	id: "util-gain",
	category: "Utilities",
	name: "gain",
	desc: "Volume control - quiet sine",
	code: `osc(440).gain(0.1).out()`,
};
