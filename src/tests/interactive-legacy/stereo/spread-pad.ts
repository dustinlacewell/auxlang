import type { TestDefinition } from "../types";

export const spreadPad: TestDefinition = {
	id: "spread-pad",
	category: "Stereo",
	name: "spread pad with envelope",
	desc: "Wide stereo pad: 4 detuned voices spread across stereo field",
	code: `// Detuned pad spread across stereo
let c = clock(30)
let s = seq("{c3,e3,g3,b3}").clk(c)

s.saw()
  .lpf({ cutoff: 800 })
  .gain({ level: s.gate.adsr({ attack: 0.3, decay: 0.2, sustain: 0.6, release: 0.5 }) })
  .spread()
  .out()`,
};
