import type { TestDefinition } from "../types";

export const seqSharpsFlats: TestDefinition = {
	id: "seq-sharps-flats",
	category: "Sequencer",
	name: "seq - sharps/flats",
	desc: "Accidentals with # (sharp) and b (flat)",
	code: `let clk = clock(120)
let s = seq("f#4 f#4 g4 a4 a4 g4 f#4 e4 d4 d4 e4 f#4 f#4 e4 e4", { clk })
s.saw()
  .lpf({ cutoff: 1800 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.1 }) })
  .out()`,
};
