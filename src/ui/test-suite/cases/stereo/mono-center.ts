import type { TestDefinition } from "../types";

export const monoCenter: TestDefinition = {
	id: "mono-center",
	category: "Stereo",
	name: "mono centered",
	desc: "Single voice plays centered (equal in both channels)",
	code: `// Single voice = mono = centered in stereo field
saw(220)
  .lpf({ cutoff: 1500 })
  .gain(0.3)
  .out()`,
};
