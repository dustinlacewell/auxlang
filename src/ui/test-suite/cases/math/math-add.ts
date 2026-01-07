import type { TestDefinition } from "../types";

export const mathAdd: TestDefinition = {
	id: "math-add",
	category: "Math",
	name: "add - mix signals",
	desc: "Two oscs added - chord",
	code: `return out(gain(add(osc(440)).b(osc(550))).amount(0.2))`,
};
