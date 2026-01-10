import type { TestDefinition } from "../types";

export const fxReverb: TestDefinition = {
	id: "fx-reverb",
	category: "Effects",
	name: "reverb",
	desc: "Medium room reverb - adds space",
	code: `saw(220).reverb({ room: 0.5, wet: 0.4, dry: 0.6 }).out()`,
};
