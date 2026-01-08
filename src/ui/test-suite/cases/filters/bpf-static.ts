import type { TestDefinition } from "../types";

export const bpfStatic: TestDefinition = {
	id: "bpf-static",
	category: "Filters",
	name: "bpf - static",
	desc: "Bandpass at 800Hz - nasal tone",
	code: `return out(gain(bpf(saw(110)).cutoff(800)).amount(0.4))`,
};
