import type { TestDefinition } from "../types";

export const polySeqChord: TestDefinition = {
	id: "poly-seq-chord",
	category: "Polyphony",
	name: "sequenced chords (comma syntax)",
	desc: "Comma stacks notes into chords - c4,e4,g4 plays simultaneously",
	code: `let clk = clock(100)
let s = seq("{a3,c4,e4} {g3,b3,d4} {f3,a3,c4} {e3,g3,b3}", { clk })
s.saw()
  .lpf({ cutoff: 1200 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.2 }) })
  .gain({ level: 0.12 })
  .out()`,
};
