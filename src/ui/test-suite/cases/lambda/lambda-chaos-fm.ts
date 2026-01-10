import type { TestDefinition } from "../types";

export const lambdaChaosFm: TestDefinition = {
	id: "lambda-chaos-fm",
	category: "Inline",
	name: "chaos FM",
	desc: "FM synthesis with chaotic modulation index",
	code: `// Chaotic FM - modulation index wanders unpredictably
let c = clock(60)
let s = seq("c3 ~ e3 ~ g3 ~ c4 ~", { clk: c })

// Carrier oscillator
s.sin()
  // FM modulation with chaotic index
  .add({
    to: sin(s.cv.mult({ by: 2 })).mult({
      by: (state, sr) => {
        // Slowly wandering modulation depth
        state.t = (state.t ?? 0) + 1 / sr
        state.drift = (state.drift ?? 0) + (Math.random() - 0.5) * 0.001
        state.drift = Math.max(-0.5, Math.min(0.5, state.drift))
        const base = Math.sin(state.t * 0.3) * 0.5 + 0.5
        return (base + state.drift) * 200
      }
    })
  })
  .lpf({ cutoff: 2000 })
  .gain({ level: s.gate.adsr({ attack: 0.1, decay: 0.2, sustain: 0.4, release: 0.5 }) })
  .mult({ by: 0.3 })
  .out()`,
};
