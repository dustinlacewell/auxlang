import type { TestDefinition } from "../types";

export const polyStackedFifths: TestDefinition = {
	id: "poly-stacked-fifths",
	category: "Polyphony",
	name: "stacked fifths (5 voices)",
	desc: "Power chord stack - heavy!",
	code: `// A1, E2, A2, E3, A3 - stacked fifths
saw([55, 82.41, 110, 164.81, 220])
  .lpf({
    cutoff: 800,
    resonance: 0.3
  })
  .gain(0.1)
  .out()`,
};
