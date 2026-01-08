import type { TestDefinition } from "../types";

export const hpfStatic: TestDefinition = {
	id: "hpf-static",
	category: "Filters",
	name: "hpf - static",
	desc: "Highpass at 500Hz - thin saw",
	code: `return out(gain(hpf(saw(110)).cutoff(500)).amount(0.3))`,
};
