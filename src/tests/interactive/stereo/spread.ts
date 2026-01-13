/**
 * spread - Distribute poly voices across stereo field
 *
 * Inputs:
 *   input: signal (default: 0) - poly input (gets distributed)
 *   width: number (default: 1) - stereo width (0=mono, 1=full)
 *
 * Outputs:
 *   out: 2-voice poly (L/R sums)
 *
 * Note: Each voice gets panned based on its index. Voice 0 → left,
 * last voice → right, others distributed between.
 */

import type { TestDefinition } from "../types";

export const spreadDefault: TestDefinition = {
	id: "spread-default",
	category: "Stereo",
	name: "spread - defaults",
	desc: "3-voice chord spread L to R",
	code: `clock(60)
  .seq("{c4,e4,g4}")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
      .spread()
      .out()
  )`,
};

export const spreadAllParams: TestDefinition = {
	id: "spread-all-params",
	category: "Stereo",
	name: "spread - all params",
	desc: "Narrow width - voices closer to center",
	code: `clock(60)
  .seq("{c4,e4,g4}")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
      .spread({ width: 0.3 })
      .out()
  )`,
};

export const spreadModWidth: TestDefinition = {
	id: "spread-mod-width",
	category: "Stereo",
	name: "spread - modulated width",
	desc: "Width sweeps narrow to wide",
	code: `clock(60)
  .seq("{c4,e4,g4}")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
      .spread({ width: sin(0.2, 0.1, 1) })
      .out()
  )`,
};

export const spreadShowcase: TestDefinition = {
	id: "spread-showcase",
	category: "Stereo",
	name: "spread - showcase",
	desc: "Wide 4-voice arpeggio across stereo field",
	code: `clock(180)
  .seq("<{c4,e4,g4,b4} {d4,f4,a4,c5}>")
  .apply(s =>
    s.saw()
      .lpf(2000)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .spread()
      .delay({ time: 0.2, feedback: 0.3, mix: 0.25 })
      .out()
  )`,
};

export const spreadTests = [spreadDefault, spreadAllParams, spreadModWidth, spreadShowcase];
