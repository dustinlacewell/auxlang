import type { TestDefinition } from "../types";

export const seqBasic: TestDefinition = {
	id: "seq-basic",
	category: "Sequencer",
	name: "seq - basic notes",
	desc: "Basic note sequence with saw through lowpass",
	code: `let clk = clock(140)
let s = seq("e4 e4 f4 g4 g4 f4 e4 d4 c4 c4 d4 e4 e4 d4 d4", { clk })
s.saw()
  .lpf({ cutoff: 2000 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }) })
  .out()`,
};
