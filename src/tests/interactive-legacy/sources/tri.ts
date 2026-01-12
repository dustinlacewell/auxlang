import type { TestDefinition } from "../types";

export const srcTri: TestDefinition = {
	id: "src-tri",
	category: "Sources",
	name: "tri",
	desc: "Triangle wave at 440Hz - soft, flute-like",
	code: `tri(440).gain(0.3).out()`,
};
