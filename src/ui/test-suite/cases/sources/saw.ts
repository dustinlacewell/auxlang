import type { TestDefinition } from "../types";

export const srcSaw: TestDefinition = {
	id: "src-saw",
	category: "Sources",
	name: "saw",
	desc: "Sawtooth wave at 220Hz - bright, buzzy",
	code: `saw(220).gain(0.2).out()`,
};
