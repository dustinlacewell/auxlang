import type { TestDefinition } from "../types";

export const polyUnison7: TestDefinition = {
	id: "poly-unison-7",
	category: "Polyphony",
	name: ".poly(7).detune(25)",
	desc: "7-voice supersaw - massive unison",
	code: `let voice = sawOsc(110).poly(7).detune(25)
return out(gain(lpf(voice).cutoff(2000)).amount(0.08))`,
};
