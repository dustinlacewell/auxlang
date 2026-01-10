import type { TestDefinition } from "../types";

export const mathInv: TestDefinition = {
	id: "math-inv",
	category: "Math",
	name: "inv - signal inversion",
	desc: "Two detuned saws, one inverted - creates hollow sound",
	code: `saw(110)
  .add({ to: saw(111.1).inv() })
  .lpf({ cutoff: 2000 })
  .gain({ level: 0.3 })
  .out()`,
};
