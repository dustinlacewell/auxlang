import type { TestDefinition } from "../types";

export const lpfStatic: TestDefinition = {
	id: "lpf-static",
	category: "Filters",
	name: "lpf - static",
	desc: "Low-pass at 500Hz - muffled saw",
	code: `return out(gain(lpf(saw(220)).cutoff(500)).amount(0.3))`,
};
