import type { TestDefinition } from "../types";

export const polyPerVoiceState: TestDefinition = {
	id: "poly-per-voice-state",
	category: "Polyphony",
	name: "independent oscillator phases",
	desc: "Each voice has its own phase - no phase lock",
	code: `// Each channel gets independent state (phase)
// You should hear a full chord, not a single tone
let chord = osc([261.63, 329.63, 392.00])
return out(gain(chord).amount(0.2))`,
};
