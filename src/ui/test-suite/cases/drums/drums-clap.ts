import type { TestDefinition } from "../types";

export const drumsClap: TestDefinition = {
	id: "drums-clap",
	category: "Drums",
	name: "clap",
	desc: "808-style clap - layered snappy sound",
	code: `let clk = clock(120)
seq("~ c4 ~ c4", { clk })
  .trig
  .clap({ decay: 0.2 })
  .out()`,
};
