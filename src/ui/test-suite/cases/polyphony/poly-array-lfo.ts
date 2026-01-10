import type { TestDefinition } from "../types";

export const polyArrayLfo: TestDefinition = {
	id: "poly-array-lfo",
	category: "Polyphony",
	name: "LFO vs static gain",
	desc: "Voices 0,2 pulse with LFO, voices 1,3 drone steady",
	code: `// 4 voices with 2 gain patterns (LFO and static)
// Pattern wraps: pulse, drone, pulse, drone
saw([220, 277.18, 329.63, 440])
  .lpf({ cutoff: 1200 })
  .gain({ level: [lfo(2).min(0).max(0.3), 0.15] })
  .out()`,
};
