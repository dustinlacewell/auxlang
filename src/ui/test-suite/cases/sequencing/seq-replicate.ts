import type { TestDefinition } from "../types";

export const seqReplicate: TestDefinition = {
	id: "seq-replicate",
	category: "Sequencer",
	name: "seq - replicate (!)",
	desc: "Bang expands note copies - c4!3 becomes c4 c4 c4",
	code: `let clk = clock(140)
let s = seq("g4!2 e4 c4!3 d4 e4", { clk })
s.saw()
  .lpf({ cutoff: 1500 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }) })
  .out()`,
};
