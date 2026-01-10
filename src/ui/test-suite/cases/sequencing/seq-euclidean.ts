import type { TestDefinition } from "../types";

export const seqEuclidean: TestDefinition = {
	id: "seq-euclidean",
	category: "Sequencer",
	name: "seq - euclidean (k,n)",
	desc: "c4(3,8) = 3 hits spread over 8 steps",
	code: `let clk = clock(140)
let s = seq("c4(3,8)", { clk })
s.saw()
  .lpf({ cutoff: 2000 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }) })
  .out()`,
};
