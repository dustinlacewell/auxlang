import type { TestDefinition } from "../types";

export const quantizeBlues: TestDefinition = {
	id: "quantize-blues",
	category: "Quantize",
	name: "blues scale",
	desc: "LFO sweep quantized to E blues - gritty lead sound",
	code: `// LFO sweep quantized to E blues
lfo(0.4)
  .scale({ min: 150, max: 500 })
  .quantize({ scaleName: "blues", root: 4, octave: 2 })
  .saw()
  .lpf({ cutoff: 1500, resonance: 0.3 })
  .gain(0.3)
  .tape({ wow: 0.4, mix: 0.3 })
  .out()`,
};
