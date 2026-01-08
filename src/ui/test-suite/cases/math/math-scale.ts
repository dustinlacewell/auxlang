import type { TestDefinition } from "../types";

export const mathScale: TestDefinition = {
	id: "math-scale",
	category: "Math",
	name: "scale - range mapping",
	desc: "LFO mapped to filter cutoff range 200-2000Hz",
	code: `let l = lfo(0.5)
let cutoff = scale(l).min(200).max(2000)
return out(gain(lpf(saw(110)).cutoff(cutoff).resonance(0.5)).amount(0.4))`,
};
