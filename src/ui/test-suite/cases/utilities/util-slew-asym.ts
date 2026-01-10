import type { TestDefinition } from "../types";

export const utilSlewAsym: TestDefinition = {
	id: "util-slew-asym",
	category: "Utilities",
	name: "slew - asymmetric rise/fall",
	desc: "Fast attack, slow decay on filter - punchy with long tail",
	code: `let clk = clock(120)
let s = seq("c3 e3", { clk })
let cutoffEnv = s.gate.env({ attack: 0.001, release: 0.05 }).mult({ by: 3000 }).slew({ rise: 0.01, fall: 0.8 })
let cutoff = cutoffEnv.add({ to: 200 })
s
  .saw()
  .lpf({ cutoff, resonance: 0.4 })
  .gain({ level: s.gate.env({ attack: 0.01, release: 0.6 }) })
  .out()`,
};
