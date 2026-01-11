import type { TestDefinition } from "../types";

export const notchStatic: TestDefinition = {
	id: "notch-static",
	category: "Filters",
	name: "notch - static",
	desc: "Notch at 500Hz - removes that frequency",
	code: `noise().notch({ cutoff: 500 }).gain(0.3).out()`,
};
