import type { TestDefinition } from "../types";

export const hpfStatic: TestDefinition = {
	id: "hpf-static",
	category: "Filters",
	name: "hpf - static",
	desc: "High-pass at 1000Hz - thin, trebly",
	code: `return out(gain(hpf(saw(110)).cutoff(1000)).amount(0.3))`,
};
