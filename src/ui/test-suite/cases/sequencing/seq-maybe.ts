import type { TestDefinition } from "../types";

export const seqMaybe: TestDefinition = {
	id: "seq-maybe",
	category: "Sequencer",
	name: "maybe (?)",
	desc: "50% probability - notes randomly drop out",
	code: `let clk = clock(160)
let s = seq("c4? e4? g4? c5?", { clk })
s.saw()
  .gain({ level: s.gate.env({ attack: 0.01, release: 0.15 }) })
  .out()`,
};
