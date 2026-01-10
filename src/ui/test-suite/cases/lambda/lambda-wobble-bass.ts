import type { TestDefinition } from "../types";

export const lambdaWobbleBass: TestDefinition = {
	id: "lambda-wobble-bass",
	category: "Inline",
	name: "wobble bass",
	desc: "Classic dubstep wobble using inline lambda LFO",
	code: `// Dubstep wobble bass - LFO rate controls filter cutoff wobble
clock(140)
  .seq("c1 ~ c1 ~ c1 ~ c1 c1")
  .apply(s =>
    s.saw()
      .lpf({
        cutoff: (state, sr) => {
          // Wobble at ~4Hz
          state.phase = ((state.phase ?? 0) + 4 / sr) % 1
          const lfo = Math.sin(state.phase * Math.PI * 2)
          // Map -1..1 to 200..2000 Hz
          return 1100 + lfo * 900
        },
        resonance: 0.7
      })
      .gain({
        level: s.gate.env({
          attack: 0.01,
          release: 0.1
        })
      })
      .mult({ by: 0.4 })
      .out()
  )`,
};
