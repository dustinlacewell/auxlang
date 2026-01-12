import type { TestDefinition } from "../types";

export const spreadChord: TestDefinition = {
	id: "spread-chord",
	category: "Stereo",
	name: "spread chord",
	desc: "3-voice chord spread across stereo field (left, center, right)",
	code: `// C major triad spread: C4 left, E4 center, G4 right
seq("{c4,e4,g4}")
  .clk(clock(60))
  .saw()
  .lpf({ cutoff: 1200 })
  .spread()
  .out()`,
};
