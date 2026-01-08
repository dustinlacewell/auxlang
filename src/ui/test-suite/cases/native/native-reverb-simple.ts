import type { TestDefinition } from "../types";

export const nativeReverbSimple: TestDefinition = {
	id: "native-reverb-simple",
	category: "Native (WASM)",
	name: "reverb - simple",
	desc: "Basic WASM reverb on continuous tone",
	code: `let tone = saw(220)
return out(reverb(tone).room(0.7).damp(0.3).wet(0.4).dry(0.6))`,
};
