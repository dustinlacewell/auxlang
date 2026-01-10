import type { TestDefinition } from "../types";

export const lambdaPolyFeedback: TestDefinition = {
	id: "lambda-poly-feedback",
	category: "Lambda",
	name: "polyphonic feedback",
	desc: "Each voice has independent feedback loop",
	code: `// Chord with per-voice echo - each note echoes independently
let c = clock(60)
let s = seq("{c4,e4,g4} ~ ~ ~", { clk: c })
s.saw()
  .lpf({ cutoff: 1500 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }) })
  .add(x => x.delay({ time: 0.2, mix: 1, feedback: 0 }).mult({ by: 0.5 }))
  .gain({ level: 0.25 })
  .out()`,
};
