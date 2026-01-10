import type { TestDefinition } from "../types";

export const chordProgression: TestDefinition = {
	id: "chord-progression",
	category: "Chord",
	name: "sequenced progression",
	desc: "I-IV-V-I chord progression with sequenced roots",
	code: `// Chord progression: C-F-G-C
clock(60).seq("c3 f3 g3 c3")
  .chord("maj")
  .saw()
  .lpf({ cutoff: 800 })
  .gain({ level: 0.15 })
  .reverb({ mix: 0.3 })
  .out()`,
};
