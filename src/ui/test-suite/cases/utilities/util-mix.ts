import type { TestDefinition } from "../types";

export const utilMix: TestDefinition = {
	id: "util-mix",
	category: "Utilities",
	name: "mix - 4 channel",
	desc: "Four detuned saws - thick unison",
	code: `let f = 220
let s1 = saw(f)
let s2 = saw(mult(f).by(1.005))
let s3 = saw(mult(f).by(0.995))
let s4 = saw(mult(f).by(1.01))
return out(gain(lpf(mix(s1).b(s2).c(s3).d(s4)).cutoff(1200)).amount(0.15))`,
};
