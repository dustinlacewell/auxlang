import type { TestDefinition } from "../types";

export const lambdaArpSpeed: TestDefinition = {
	id: "lambda-arp-speed",
	category: "Inline",
	name: "accelerating arp",
	desc: "Arpeggio that speeds up over time using lambda clock multiplier",
	code: `// Accelerating arpeggio - tempo ramps up then resets
let baseClk = clock(120)

// Clock multiplier with lambda-controlled speed
let fastClk = clockMult(baseClk).by((s, sr) => {
  s.t = (s.t ?? 0) + 1 / sr
  // Accelerate from 1x to 4x over 4 seconds, then reset
  if (s.t > 4) s.t = 0
  return 1 + (s.t / 4) * 3
})

let s = seq("c4 e4 g4 b4", { clk: fastClk })
s.saw()
  .lpf({ cutoff: 2000, resonance: 0.2 })
  .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }) })
  .mult({ by: 0.3 })
  .out()`,
};
