import type { TestDefinition } from "../types";

export const mathAbs: TestDefinition = {
	id: "math-abs",
	category: "Math",
	name: "abs - full-wave rectify",
	desc: "LFO rectified for double-speed unipolar modulation",
	code: `saw(55)
  .lpf({
    cutoff: lfo(2).abs().mult({ by: 1500 }).add({ to: 300 }),
    resonance: 0.6
  })
  .gain(0.4)
  .out()`,
};
