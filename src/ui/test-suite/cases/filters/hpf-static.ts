import type { TestDefinition } from "../types";

export const hpfStatic: TestDefinition = {
	id: "hpf-static",
	category: "Filters",
	name: "hpf - static",
	desc: "Highpass at 500Hz - thin saw",
	code: `saw(110).hpf({ cutoff: 500 }).gain({ level: 0.3 }).out()`,
};
