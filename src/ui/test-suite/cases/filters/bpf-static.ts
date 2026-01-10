import type { TestDefinition } from "../types";

export const bpfStatic: TestDefinition = {
	id: "bpf-static",
	category: "Filters",
	name: "bpf - static",
	desc: "Bandpass at 800Hz - nasal tone",
	code: `saw(110).bpf({ cutoff: 800 }).gain({ level: 0.4 }).out()`,
};
