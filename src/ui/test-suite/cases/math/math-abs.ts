import type { TestDefinition } from "../types";

export const mathAbs: TestDefinition = {
	id: "math-abs",
	category: "Math",
	name: "abs - full-wave rectify",
	desc: "LFO rectified for double-speed unipolar modulation",
	code: `let l = lfo(2)
let rectified = abs(l)
let cutoff = add(mult(rectified).by(1500)).to(300)
return out(gain(lpf(saw(55)).cutoff(cutoff).resonance(0.6)).amount(0.4))`,
};
