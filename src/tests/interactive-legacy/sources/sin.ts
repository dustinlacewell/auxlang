import type { TestDefinition } from "../types";

export const srcSin: TestDefinition = {
	id: "src-sin",
	category: "Sources",
	name: "sin",
	desc: "Explicit sine oscillator at 330Hz",
	code: `sin(330).gain(0.3).out()`,
};
