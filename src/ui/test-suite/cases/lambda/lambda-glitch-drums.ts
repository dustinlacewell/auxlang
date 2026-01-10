import type { TestDefinition } from "../types";

export const lambdaGlitchDrums: TestDefinition = {
	id: "lambda-glitch-drums",
	category: "Inline",
	name: "glitch drums",
	desc: "Probability-based drum hits using ? syntax",
	code: `// Glitch drums using probability syntax
clock(130)
  .apply(c => {
    // Kick with 90% probability
    c.seq("c1?.9 ~ c1?.9 ~")
      .trig
      .kick()
      .out()

    // Hi-hat
    c.seq("c1*4")
      .trig
      .hihat()
      .gain({ level: 0.4 })
      .out()

    // Snare on 2 and 4 with 80% probability
    c.seq("~ c1?.8 ~ c1")
      .trig
      .snare()
      .gain({ level: 0.5 })
      .out()
  })`,
};
