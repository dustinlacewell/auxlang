import type { TestDefinition } from "../types";

export const mathAdd: TestDefinition = {
	id: "math-add",
	category: "Math",
	name: "add - mix signals",
	desc: "Two oscs added - chord",
	code: "osc(440).add({ to: osc(550) }).gain({ level: 0.2 }).out()",
};
