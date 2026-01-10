import type { TestDefinition } from "../types";

export const srcLfo: TestDefinition = {
	id: "src-lfo",
	category: "Sources",
	name: "lfo",
	desc: "LFO modulating pitch - audible wobble",
	code: `osc(lfo(2).min(300).max(500)).gain({ level: 0.3 }).out()`,
};
