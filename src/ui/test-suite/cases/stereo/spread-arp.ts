import type { TestDefinition } from "../types";

export const spreadArp: TestDefinition = {
	id: "spread-arp",
	category: "Stereo",
	name: "spread arpeggio",
	desc: "4-voice arpeggio spread: voices ping-pong across stereo field",
	code: `// 4 notes spread: [0]left, [1]right, [2]left, [3]right
seq("{c3,e3,g3,b3}")
  .clk(clock(120))
  .saw()
  .lpf({ cutoff: 800 })
  .gain(0.3)
  .spread()
  .out()`,
};
