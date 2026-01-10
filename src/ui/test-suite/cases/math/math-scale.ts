import type { TestDefinition } from "../types";

export const mathScale: TestDefinition = {
	id: "math-scale",
	category: "Math",
	name: "scale - range mapping",
	desc: "LFO mapped to filter cutoff range 200-2000Hz",
	code: `saw(110)
  .lpf({
    cutoff: lfo(0.5).scale({ min: 200, max: 2000 }),
    resonance: 0.5
  })
  .gain({ level: 0.4 })
  .out()`,
};
