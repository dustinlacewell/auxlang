import type { TestDefinition } from "../types";

export const lambdaArpSpeed: TestDefinition = {
	id: "lambda-arp-speed",
	category: "Inline",
	name: "accelerating arp",
	desc: "Arpeggio that speeds up over time using lambda clock multiplier",
	code: `// Accelerating arpeggio - tempo ramps up then resets
clock(120)
  .clockMult({
    by: (s, sr, t) => {
      const cycleT = t % 4  // Reset every 4 seconds
      // Accelerate from 1x to 4x over 4 seconds
      return 1 + (cycleT / 4) * 3
    }
  })
  .seq("c4 e4 g4 b4")
  .apply(s =>
    s.saw()
      .lpf({
        cutoff: 2000,
        resonance: 0.2
      })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.1
        })
      })
      .mult({ by: 0.3 })
      .out()
  )`,
};
