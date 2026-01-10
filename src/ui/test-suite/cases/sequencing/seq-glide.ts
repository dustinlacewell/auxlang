import type { TestDefinition } from "../types";

export const seqGlide: TestDefinition = {
	id: "seq-glide",
	category: "Sequencer",
	name: "seq - glide (_)",
	desc: "c3_g3 ~ e3_c4 - legato phrases with gap",
	code: `let clk = clock(120)
let s = seq("c3_g3 ~ e3_c4", { clk })
let smoothPitch = s.cv.slew({ rise: 0.01, fall: 0 })
smoothPitch.saw()
  .lpf({ cutoff: 1200 })
  .gain({ level: s.gate.adsr({ attack: 0.5, decay: 0.1, sustain: 0.35, release: 0.05 }) })
  .out()`,
};
