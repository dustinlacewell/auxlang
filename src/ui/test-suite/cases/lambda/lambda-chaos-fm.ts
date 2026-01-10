import type { TestDefinition } from "../types";

export const lambdaChaosFm: TestDefinition = {
	id: "lambda-chaos-fm",
	category: "Inline",
	name: "chaos FM",
	desc: "FM synthesis with lambda-driven chaotic modulation depth",
	code: `// FM with chaotic modulation depth via inline lambda
clock(60)
  .seq("c3 ~ e3 ~ g3 ~ c4 ~")
  .apply(s => {
    // Lambda for chaotic wandering mod depth (control signal, not audio)
    let modDepth = (state, sr, t) => {
      // Random walk with bounds
      state.depth = state.depth ?? 100
      state.depth += (Math.random() - 0.5) * 2
      state.depth = Math.max(50, Math.min(400, state.depth))
      // Add sine wobble
      return state.depth + Math.sin(t * 2) * 50
    }

    // Modulator with lambda-controlled depth
    let fmMod = sin(s.cv.mult({ by: 3 })).mult({ by: modDepth })

    // Carrier with FM
    sin(s.cv.add({ to: fmMod }))
      .lpf({ cutoff: 4000 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.3,
          sustain: 0.3,
          release: 0.4
        })
      })
      .gain({ level: 0.4 })
      .out()
  })`,
};
