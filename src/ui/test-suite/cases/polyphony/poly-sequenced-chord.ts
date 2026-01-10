import type { TestDefinition } from "../types";

export const polySequencedChord: TestDefinition = {
	id: "poly-sequenced-chord",
	category: "Polyphony",
	name: "sequenced poly voices",
	desc: "Rhythmic gate triggers a fixed frequency chord",
	code: `let clk = clock(125)
let s = seq("c4 ~ c4 c4 ~ c4 ~ c4", { clk })
// Use the seq gate to trigger a chord (poly pitch, mono gate broadcasts)
saw([293.66, 369.99, 440.00])
  .lpf({ cutoff: 1500 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.1 }) })
  .gain({ level: 0.15 })
  .out()`,
};
