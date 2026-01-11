import type { TestDefinition } from "../types";

export const srcOsc: TestDefinition = {
	id: "src-osc",
	category: "Sources",
	name: "osc (sine)",
	desc: "Pure sine wave at 440Hz - smooth, no harmonics",
	code: `osc(440).gain(0.3).out()`,
};
