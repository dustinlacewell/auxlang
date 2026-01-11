import type { TestDefinition } from "../types";

export const stereoTwoVoice: TestDefinition = {
	id: "stereo-two-voice",
	category: "Stereo",
	name: "two voices L/R",
	desc: "Two voices without spread: voice 0 left, voice 1 right (automatic round-robin)",
	code: `// Two-voice chord: automatically pans left/right
seq("{c3,g3}")
  .clk(clock(60))
  .saw()
  .lpf({ cutoff: 600 })
  .gain(0.4)
  .out()`,
};
