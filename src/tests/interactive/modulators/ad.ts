/**
 * ad - Attack-Decay envelope generator
 *
 * Inputs:
 *   gate: signal (default: 0) - triggers on rising edge
 *   attack: number (default: 0.01) - attack time in seconds
 *   decay: number (default: 0.1) - decay time in seconds
 *
 * Outputs:
 *   cv: envelope output 0-1
 *
 * Note: Triggers on gate rising edge, then decays to zero.
 * Gate duration is IGNORED - use for plucky/percussive sounds.
 */

import type { TestDefinition } from "../types";

export const adDefault: TestDefinition = {
	id: "ad-default",
	category: "Modulators",
	name: "ad - defaults",
	desc: "Plucky hit - envelope completes regardless of gate duration",
	code: `clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad())
      .out()
  )`,
};

export const adAllParams: TestDefinition = {
	id: "ad-all-params",
	category: "Modulators",
	name: "ad - all params",
	desc: "Fast attack, medium decay",
	code: `clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.2 }))
      .out()
  )`,
};

export const adModAttack: TestDefinition = {
	id: "ad-mod-attack",
	category: "Modulators",
	name: "ad - modulated attack",
	desc: "Attack time varies 0.001s to 0.1s",
	code: `clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({
        attack: sin(0.2, 0.001, 0.1),
        decay: 0.15
      }))
      .out()
  )`,
};

export const adModDecay: TestDefinition = {
	id: "ad-mod-decay",
	category: "Modulators",
	name: "ad - modulated decay",
	desc: "Decay time varies 0.05s to 0.4s",
	code: `clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({
        attack: 0.005,
        decay: sin(0.2, 0.05, 0.4)
      }))
      .out()
  )`,
};

export const adShowcase: TestDefinition = {
	id: "ad-showcase",
	category: "Modulators",
	name: "ad - showcase",
	desc: "Plucky bass with filter envelope",
	code: `clock(120)
  .seq("c2 ~ g2 ~ e2 ~ g2 ~")
  .apply(s =>
    s.saw()
      .lpf(s.gate.ad({ attack: 0.01, decay: 0.2 }).scale(200, 2500))
      .gain(s.gate.ad({ attack: 0.005, decay: 0.25 }))
      .out()
  )`,
};

export const adTests = [adDefault, adAllParams, adModAttack, adModDecay, adShowcase];
