import type { TestDefinition } from "../types";

export const drumsKick: TestDefinition = {
	id: "drums-kick",
	category: "Drums",
	name: "kick",
	desc: "808-style kick drum - deep thump",
	code: `let clk = clock(120)
seq("c4 c4 c4 c4", { clk })
  .trig
  .kick({ pitch: 50, decay: 0.3, sweep: 3 })
  .out()`,
};
