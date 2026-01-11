import type { TestDefinition } from "../types";

export const srcSqr: TestDefinition = {
	id: "src-sqr",
	category: "Sources",
	name: "sqr",
	desc: "Square wave at 330Hz - hollow, clarinet-like",
	code: `sqr(330).gain(0.2).out()`,
};
