import type { TestDefinition } from "../types";

export const quantizeChromatic: TestDefinition = {
	id: "quantize-chromatic",
	category: "Quantize",
	name: "chromatic (all notes)",
	desc: "LFO sweep quantized to chromatic - all 12 notes",
	code: `// Fast LFO sweep, quantized to chromatic scale
lfo(2)
  .scale({ min: 200, max: 800 })
  .quantize({ scaleName: "chromatic" })
  .sqr()
  .lpf({ cutoff: 3000 })
  .gain({ level: 0.2 })
  .out()`,
};
