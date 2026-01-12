import type { TestDefinition } from "../types";

export const drumsSnare: TestDefinition = {
	id: "drums-snare",
	category: "Drums",
	name: "snare",
	desc: "808-style snare - punchy with noise",
	code: `clock(120)
  .seq("~ c4 ~ c4")
  .trig
  .snare()
  .out()`,
};
