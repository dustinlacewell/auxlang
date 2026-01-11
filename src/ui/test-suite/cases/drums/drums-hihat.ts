import type { TestDefinition } from "../types";

export const drumsHihat: TestDefinition = {
	id: "drums-hihat",
	category: "Drums",
	name: "hihat",
	desc: "808-style hihat - metallic tick",
	code: `clock(120)
  .seq("c4*8")
  .trig
  .hihat()
  .gain(0.5)
  .out()`,
};
