import type { TestDefinition } from "../types";

export const utilMix: TestDefinition = {
	id: "util-mix",
	category: "Utilities",
	name: "mix - 4 channel",
	desc: "Four detuned saws - thick unison",
	code: `let f = 220
mix(saw(f))
  .b(saw(mult(f).by(1.005)))
  .c(saw(mult(f).by(0.995)))
  .d(saw(mult(f).by(1.01)))
  .lpf({ cutoff: 1200 })
  .gain({ level: 0.15 })
  .out()`,
};
