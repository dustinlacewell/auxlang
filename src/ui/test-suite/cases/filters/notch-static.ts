import type { TestDefinition } from "../types";

export const notchStatic: TestDefinition = {
	id: "notch-static",
	category: "Filters",
	name: "notch - static",
	desc: "Notch at 500Hz - removes that frequency",
	code: `return out(gain(notch(noise()).cutoff(500)).amount(0.3))`,
};
