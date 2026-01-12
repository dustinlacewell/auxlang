import type { TestDefinition } from "../types";

export const utilMix: TestDefinition = {
	id: "util-mix",
	category: "Utilities",
	name: "mix - 4 channel",
	desc: "Four detuned saws - thick unison",
	code: `mix(saw(220))
  .b(saw(221.1))
  .c(saw(218.9))
  .d(saw(222.2))
  .lpf({ cutoff: 1200 })
  .gain(0.15)
  .out()`,
};
