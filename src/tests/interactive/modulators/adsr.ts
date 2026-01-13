/**
 * adsr - ADSR envelope generator
 *
 * Inputs:
 *   gate: signal (default: 0) - gate signal (>0.5 = on)
 *   attack: number (default: 0.01) - attack time in seconds
 *   decay: number (default: 0.1) - decay time in seconds
 *   sustain: number (default: 0.7) - sustain level 0-1 (held while gate ON)
 *   release: number (default: 0.3) - release time in seconds
 *
 * Outputs:
 *   cv: envelope output 0-1
 *
 * Note: sustain is a LEVEL, not duration. The envelope stays at sustain level
 * while gate is held. For plucky sounds that ignore gate duration, use ad().
 */

import type { TestDefinition } from "../types";

export const adsrDefault: TestDefinition = {
	id: "adsr-default",
	category: "Modulators",
	name: "adsr - defaults",
	desc: "Pad sound - gate held for full beat, hear sustain phase",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr())
      .out()
  )`,
};

export const adsrAllParams: TestDefinition = {
	id: "adsr-all-params",
	category: "Modulators",
	name: "adsr - all params",
	desc: "All params specified - low sustain level",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr({
        attack: 0.1,
        decay: 0.2,
        sustain: 0.3,
        release: 0.4
      }))
      .out()
  )`,
};

export const adsrModAttack: TestDefinition = {
	id: "adsr-mod-attack",
	category: "Modulators",
	name: "adsr - modulated attack",
	desc: "Attack time varies 0.01s to 0.5s",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr({
        attack: sin(0.1, 0.01, 0.5),
        decay: 0.1,
        sustain: 0.5,
        release: 0.3
      }))
      .out()
  )`,
};

export const adsrModDecay: TestDefinition = {
	id: "adsr-mod-decay",
	category: "Modulators",
	name: "adsr - modulated decay",
	desc: "Decay time varies 0.05s to 0.5s",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr({
        attack: 0.01,
        decay: sin(0.15, 0.05, 0.5),
        sustain: 0.3,
        release: 0.3
      }))
      .out()
  )`,
};

export const adsrModSustain: TestDefinition = {
	id: "adsr-mod-sustain",
	category: "Modulators",
	name: "adsr - modulated sustain",
	desc: "Sustain level varies 0.1 to 0.9",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr({
        attack: 0.05,
        decay: 0.15,
        sustain: sin(0.2, 0.1, 0.9),
        release: 0.3
      }))
      .out()
  )`,
};

export const adsrModRelease: TestDefinition = {
	id: "adsr-mod-release",
	category: "Modulators",
	name: "adsr - modulated release",
	desc: "Release time varies 0.1s to 0.8s",
	code: `clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr({
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: sin(0.15, 0.1, 0.8)
      }))
      .out()
  )`,
};

export const adsrShowcase: TestDefinition = {
	id: "adsr-showcase",
	category: "Modulators",
	name: "adsr - showcase",
	desc: "Dual envelope: filter + amp with different sustain levels",
	code: `clock(90)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.saw()
      .lpf(s.gate.adsr({
        attack: 0.01,
        decay: 0.4,
        sustain: 0.15,
        release: 0.4
      }).scale(100, 4000))
      .gain(s.gate.adsr({
        attack: 0.01,
        decay: 0.2,
        sustain: 0.6,
        release: 0.5
      }))
      .out()
  )`,
};

export const adsrTests = [
	adsrDefault,
	adsrAllParams,
	adsrModAttack,
	adsrModDecay,
	adsrModSustain,
	adsrModRelease,
	adsrShowcase,
];
