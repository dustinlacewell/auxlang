import type { TestDefinition } from "../types";

export const mathRingMod: TestDefinition = {
	id: "math-ring-mod",
	category: "Math",
	name: "mult - ring mod",
	desc: "Two oscs multiplied - metallic sound",
	code: `return out(gain(mult(osc(440)).b(osc(110))).amount(0.3))`,
};
