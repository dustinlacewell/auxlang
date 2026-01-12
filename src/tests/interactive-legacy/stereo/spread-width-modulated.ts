import type { TestDefinition } from "../types";

export const spreadWidthModulated: TestDefinition = {
	id: "spread-width-modulated",
	category: "Stereo",
	name: "spread width modulated",
	desc: "Chord panning modulated by LFO - sweeps from normal to reversed stereo",
	code: `// C major triad with width modulated by slow LFO
// LFO sweeps from -1 (reversed) to 1 (normal stereo)
seq("{c4,e4,g4}")
  .clk(clock(60))
  .saw()
  .lpf({ cutoff: 1200 })
  .spread({ width: lfo(0.25) })
  .out()`,
};
