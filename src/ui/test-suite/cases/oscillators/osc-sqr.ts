import type { TestDefinition } from "../types";

export const oscSqr: TestDefinition = {
	id: "osc-sqr",
	category: "Oscillators",
	name: "sqr",
	desc: "Square wave at 330Hz - hollow, clarinet-like",
	code: `return out(gain(sqr(330)).amount(0.2))`,
};
