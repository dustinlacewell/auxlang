import type { TestDefinition } from "../types";

export const stereoRoundRobin: TestDefinition = {
	id: "stereo-round-robin",
	category: "Stereo",
	name: "round-robin 5 voices",
	desc: "5 voices round-robin: L-R-L-R-L distribution",
	code: `// 5 voices without spread: evens go left, odds go right
seq("{c3,d3,e3,f3,g3}")
  .clk(clock(90))
  .saw()
  .lpf({ cutoff: 1000 })
  .gain(0.25)
  .out()`,
};
