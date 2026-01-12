import type { TestDefinition } from "../types";

export const srcNoise: TestDefinition = {
	id: "src-noise",
	category: "Sources",
	name: "noise",
	desc: "White noise - hissy, all frequencies",
	code: `noise().gain(0.15).out()`,
};
