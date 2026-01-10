import type { TestDefinition } from "../types";

export const quantizeBluesModulated: TestDefinition = {
	id: "quantize-blues-modulated",
	category: "Quantize",
	name: "pentatonic blues (all modulated)",
	desc: "Pentatonic blues scale with LFO-modulated range, octave, and root",
	code: `// Pentatonic blues with everything modulated
lfo(0.3)
  .scale({ min: 100, max: 800 })
  .quantize({
    scaleName: "pentatonic blues",
    root: lfo(0.07).scale({ min: 0, max: 11 }),
    octave: lfo(0.13).scale({ min: 2, max: 4 }),
    range: lfo(0.09).scale({ min: 1, max: 5 })
  })
  .saw()
  .lpf({ cutoff: 1800, resonance: 0.2 })
  .gain({ level: 0.3 })
  .delay({ time: 0.15, feedback: 0.4, mix: 0.3 })
  .out()`,
};
