import type { TestDefinition } from "../types";

export const quantizeWholeTone: TestDefinition = {
	id: "quantize-whole-tone",
	category: "Quantize",
	name: "whole tone",
	desc: "Dreamy whole tone scale - no semitones, only whole steps",
	code: `// Slow LFO, quantized to whole tone scale
lfo(0.15)
  .scale({ min: 200, max: 600 })
  .quantize({ scaleName: "whole tone" })
  .sin()
  .reverb({ room: 0.8, mix: 0.5 })
  .gain(0.3)
  .out()`,
};
