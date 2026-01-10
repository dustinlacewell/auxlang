import type { TestDefinition } from "../types";

export const lambdaGlitchDrums: TestDefinition = {
	id: "lambda-glitch-drums",
	category: "Inline",
	name: "glitch drums",
	desc: "Probability-based drum hits with lambda randomness",
	code: `// Glitch drums - each hit has random probability and timing jitter
let c = clock(130)

// Kick with slight probability variation
kick(seq("c1 ~ c1 ~", { clk: c }).gate).mult({
  by: (s, sr) => {
    // 90% probability per step
    s.counter = ((s.counter ?? 0) + 1) % Math.floor(sr * 0.1)
    if (s.counter === 0) s.play = Math.random() > 0.1 ? 1 : 0
    return s.play ?? 1
  }
}).out()

// Hi-hat with random velocity
hihat(seq("c1*4", { clk: c }).gate).mult({
  by: (s, sr) => {
    s.counter = ((s.counter ?? 0) + 1) % Math.floor(sr * 0.05)
    if (s.counter === 0) s.vel = 0.3 + Math.random() * 0.7
    return s.vel ?? 0.5
  }
}).mult({ by: 0.4 }).out()

// Snare on 2 and 4 with glitchy repeats
snare(seq("~ c1 ~ c1", { clk: c }).gate).mult({
  by: (s, sr) => {
    s.counter = ((s.counter ?? 0) + 1) % Math.floor(sr * 0.08)
    if (s.counter === 0) {
      // Occasionally double-hit
      s.hits = Math.random() > 0.8 ? 2 : 1
    }
    return s.hits > 0 ? 1 : 0
  }
}).mult({ by: 0.5 }).out()`,
};
