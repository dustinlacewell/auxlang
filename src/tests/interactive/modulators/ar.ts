/**
 * ar - Attack-Release envelope generator
 *
 * Inputs:
 *   gate: signal (default: 0) - gate signal (>0.5 = on)
 *   attack: number (default: 0.01) - attack time in seconds
 *   release: number (default: 0.1) - release time in seconds
 *
 * Outputs:
 *   cv: envelope output 0-1
 *
 * Note: Ramps to 1.0 during attack, HOLDS at 1.0 while gate is ON,
 * then releases to 0 when gate goes OFF. Simpler than ADSR (no decay/sustain).
 */

import type { TestDefinition } from "../types";

export const arDefault: TestDefinition = {
	id: "ar-default",
	category: "Modulators",
	name: "ar - defaults",
	desc: "Gate-controlled - holds at full volume while gate is on",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ar())
      .out()
  )`,
};

export const arAllParams: TestDefinition = {
	id: "ar-all-params",
	category: "Modulators",
	name: "ar - all params",
	desc: "Slow attack, medium release",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ar({ attack: 0.2, release: 0.3 }))
      .out()
  )`,
};

export const arModAttack: TestDefinition = {
	id: "ar-mod-attack",
	category: "Modulators",
	name: "ar - modulated attack",
	desc: "Attack time varies 0.01s to 0.5s",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ar({
        attack: sin(0.15, 0.01, 0.5),
        release: 0.2
      }))
      .out()
  )`,
};

export const arModRelease: TestDefinition = {
	id: "ar-mod-release",
	category: "Modulators",
	name: "ar - modulated release",
	desc: "Release time varies 0.05s to 0.6s",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ar({
        attack: 0.01,
        release: sin(0.15, 0.05, 0.6)
      }))
      .out()
  )`,
};

export const arShowcase: TestDefinition = {
	id: "ar-showcase",
	category: "Modulators",
	name: "ar - showcase",
	desc: "Chord with slow attack, filter follows amplitude",
	code: `clock(45)
  .seq("{c4,e4,g4} ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(s.gate.ar({ attack: 0.5, release: 0.8 }).scale(400, 2000))
      .gain(s.gate.ar({ attack: 0.5, release: 0.8 }))
      .out()
  )`,
};

export const arTests = [arDefault, arAllParams, arModAttack, arModRelease, arShowcase];
