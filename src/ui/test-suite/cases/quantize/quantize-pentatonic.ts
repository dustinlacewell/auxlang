import type { TestDefinition } from "../types";

export const quantizePentatonic: TestDefinition = {
	id: "quantize-pentatonic",
	category: "Quantize",
	name: "pentatonic scale",
	desc: "LFO sweep quantized to A minor pentatonic - always sounds good",
	code: `// Slow LFO sweeping, quantized to A minor pentatonic
lfo(0.2)
  .scale({ min: 150, max: 600 })
  .quantize({ scaleName: "minor pentatonic", root: 9 })
  .sin()
  .gain({ level: 0.4 })
  .reverb({ mix: 0.3 })
  .out()`,
};
