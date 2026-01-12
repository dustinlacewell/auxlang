import type { TestDefinition } from "../types";

export const mathRingMod: TestDefinition = {
	id: "math-ring-mod",
	category: "Math",
	name: "mult - ring mod",
	desc: "Two oscs multiplied - metallic sound",
	code: `osc(440)
  .mult({ by: osc(110) })
  .gain(0.3)
  .out()`,
};
