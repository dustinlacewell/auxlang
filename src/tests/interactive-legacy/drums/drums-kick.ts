import type { TestDefinition } from "../types";

export const drumsKick: TestDefinition = {
	id: "drums-kick",
	category: "Drums",
	name: "kick",
	desc: "808-style kick drum - deep thump",
	code: `clock(120)
  .seq("c4 c4 c4 c4")
  .trig
  .kick()
  .out()`,
};
