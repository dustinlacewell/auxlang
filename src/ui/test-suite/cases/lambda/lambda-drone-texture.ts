import type { TestDefinition } from "../types";

export const lambdaDroneTexture: TestDefinition = {
	id: "lambda-drone-texture",
	category: "Inline",
	name: "drone texture",
	desc: "Evolving ambient drone with lambda-controlled parameters",
	code: `// Ambient drone - slowly evolving texture via lambdas
// Base drone with wandering pitch using time parameter
saw((s, sr, t) => {
  // Very slow pitch drift around 55Hz (A1)
  const drift = Math.sin(t * 0.05) * 2 + Math.sin(t * 0.13) * 1
  return 55 + drift
})
  // Filter with slow organic movement
  .lpf({
    cutoff: (s, sr, t) => {
      // Multiple slow LFOs combined
      const a = Math.sin(t * 0.07) * 300
      const b = Math.sin(t * 0.11) * 200
      const c = Math.sin(t * 0.03) * 400
      return 600 + a + b + c
    },
    resonance: 0.3
  })
  // Amplitude breathes slowly
  .mult({
    by: (s, sr, t) => 0.15 + Math.sin(t * 0.08) * 0.1
  })
  .out()`,
};
