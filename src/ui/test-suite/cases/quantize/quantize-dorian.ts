import type { TestDefinition } from "../types";

export const quantizeDorian: TestDefinition = {
	id: "quantize-dorian",
	category: "Quantize",
	name: "dorian mode",
	desc: "LFO sweep quantized to D dorian mode",
	code: `// LFO sweep quantized to D dorian
lfo(0.25)
  .scale({ min: 150, max: 400 })
  .quantize({ scaleName: "dorian", root: 2 })
  .tri()
  .lpf({ cutoff: 1200 })
  .gain({ level: 0.3 })
  .out()`,
};
