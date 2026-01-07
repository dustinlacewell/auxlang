import type { TestDefinition } from "../types";

export const oscTri: TestDefinition = {
	id: "osc-tri",
	category: "Oscillators",
	name: "tri",
	desc: "Triangle wave at 440Hz - soft, flute-like",
	code: `return out(gain(tri(440)).amount(0.3))`,
};
