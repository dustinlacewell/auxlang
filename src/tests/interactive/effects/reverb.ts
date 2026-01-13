/**
 * reverb - Dattorro plate reverb
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   room: number (default: 0.5) - room size 0-1
 *   damp: number (default: 0.5) - high frequency damping 0-1
 *   mix: number (default: 0.33) - dry/wet mix 0-1
 *
 * Outputs:
 *   audio: reverbed signal
 *
 * Note: Use ad() for plucky sounds feeding into reverb.
 */

import type { TestDefinition } from "../types";

export const reverbDefault: TestDefinition = {
	id: "reverb-default",
	category: "Effects",
	name: "reverb - defaults",
	desc: "Plucky hit with default reverb",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb()
      .out()
  )`,
};

export const reverbAllParams: TestDefinition = {
	id: "reverb-all-params",
	category: "Effects",
	name: "reverb - all params",
	desc: "All params specified - large dark hall",
	code: `clock(60)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .reverb({
        room: 0.9,
        damp: 0.7,
        mix: 0.55
      })
      .out()
  )`,
};

export const reverbModRoom: TestDefinition = {
	id: "reverb-mod-room",
	category: "Effects",
	name: "reverb - modulated room",
	desc: "Room size varies 0.3 to 0.95",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb({
        room: sin(0.1, 0.3, 0.95),
        mix: 0.5
      })
      .out()
  )`,
};

export const reverbModDamp: TestDefinition = {
	id: "reverb-mod-damp",
	category: "Effects",
	name: "reverb - modulated damp",
	desc: "Damping varies 0.1 to 0.9 - bright to dark",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb({
        room: 0.75,
        damp: sin(0.15, 0.1, 0.9),
        mix: 0.5
      })
      .out()
  )`,
};

export const reverbModMix: TestDefinition = {
	id: "reverb-mod-mix",
	category: "Effects",
	name: "reverb - modulated mix",
	desc: "Mix varies 0.1 to 0.8 - dry to wet sweep",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb({
        room: 0.7,
        mix: sin(0.2, 0.1, 0.8)
      })
      .out()
  )`,
};

export const reverbShowcase: TestDefinition = {
	id: "reverb-showcase",
	category: "Effects",
	name: "reverb - showcase",
	desc: "Ambient chord stabs with lush reverb",
	code: `clock(60)
  .seq("{c4,e4,g4} ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1800)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.2 }))
      .reverb({
        room: 0.85,
        damp: 0.4,
        mix: 0.55
      })
      .out()
  )`,
};

export const reverbTests = [
	reverbDefault,
	reverbAllParams,
	reverbModRoom,
	reverbModDamp,
	reverbModMix,
	reverbShowcase,
];
