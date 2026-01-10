import type { TestDefinition } from "../types";

export const lambdaInlineRandom: TestDefinition = {
	id: "lambda-inline-random",
	category: "Inline",
	name: "inline random",
	desc: "Lambda generates sample-and-hold randomness",
	code: `// Sample-and-hold random filter cutoff
// Updates randomly every ~0.1 seconds
clock(120)
  .seq("c3 e3 g3 c4")
  .apply(s =>
    s.saw()
      .lpf({
        cutoff: (state, sr) => {
          state.timer = (state.timer ?? 0) + 1
          if (state.timer > sr * 0.1) {
            state.timer = 0
            state.value = 400 + Math.random() * 1200
          }
          return state.value ?? 800
        }
      })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          sustain: 0.5,
          release: 0.2
        })
      })
      .mult({ by: 0.3 })
      .out()
  )`,
};
