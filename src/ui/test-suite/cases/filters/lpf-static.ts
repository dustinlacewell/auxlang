import type { TestDefinition } from "../types";

export const lpfStatic: TestDefinition = {
	id: "lpf-static",
	category: "Filters",
	name: "lpf - static",
	desc: "Lowpass at 500Hz - muffled saw",
	code: `saw(110).lpf({ cutoff: 500 }).gain({ level: 0.3 }).out()`,
};
