import type { TestDefinition } from "../types";

export const oscSine: TestDefinition = {
	id: "osc-sine",
	category: "Oscillators",
	name: "osc (sine)",
	desc: "Pure sine wave at 440Hz - smooth, no harmonics",
	code: `return out(gain(osc(440)).amount(0.3))`,
};
