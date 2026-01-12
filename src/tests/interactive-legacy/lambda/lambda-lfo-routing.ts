import type { TestDefinition } from "../types";

export const lambdaLfoRouting: TestDefinition = {
	id: "lambda-lfo-routing",
	category: "Apply",
	name: "LFO signal routing",
	desc: "Use apply to route one LFO to multiple destinations",
	code: `// Single LFO modulates both pitch and filter
lfo(0.5)
  .apply(mod =>
    saw(220)
      .freq(mod.scale({
        from: -1,
        to: 1,
        min: 200,
        max: 240
      }))
      .lpf({
        cutoff: mod.scale({
          from: -1,
          to: 1,
          min: 400,
          max: 1600
        })
      })
      .gain(0.3)
      .out()
  )`,
};
