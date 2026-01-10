import type { TestDefinition } from "../types";

export const quantizeMajor: TestDefinition = {
	id: "quantize-major",
	category: "Quantize",
	name: "major scale",
	desc: "LFO sweep quantized to C major scale",
	code: `// LFO sweeping through frequencies, snapped to C major
lfo(0.3)
  .scale({ min: 200, max: 500 })
  .quantize({ scaleName: "major" })
  .saw()
  .lpf({ cutoff: 2000 })
  .gain({ level: 0.3 })
  .out()`,
};
