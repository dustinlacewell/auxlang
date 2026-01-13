/**
 * pan - Position sound in stereo field
 *
 * Inputs:
 *   input: signal (default: 0) - audio input (mono or poly, gets summed)
 *   pan: number (default: 0) - position (-1=L, 0=center, 1=R)
 *
 * Outputs:
 *   signal: 2-voice poly (L/R with constant-power panning)
 *
 * Note: Sums all input voices to mono, then outputs L/R pair.
 * Use spread() to distribute poly voices across stereo instead.
 */

import type { TestDefinition } from "../types";

export const panDefault: TestDefinition = {
	id: "pan-default",
	category: "Stereo",
	name: "pan - defaults",
	desc: "Center panned (equal L/R)",
	code: `clock(90)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .pan()
      .out()
  )`,
};

export const panAllParams: TestDefinition = {
	id: "pan-all-params",
	category: "Stereo",
	name: "pan - all params",
	desc: "Hard panned right",
	code: `clock(90)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .pan({ pan: 1 })
      .out()
  )`,
};

export const panModPan: TestDefinition = {
	id: "pan-mod-pan",
	category: "Stereo",
	name: "pan - modulated pan",
	desc: "Pan sweeps L to R",
	code: `clock(90)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .pan({ pan: sin(0.3, -1, 1) })
      .out()
  )`,
};

export const panShowcase: TestDefinition = {
	id: "pan-showcase",
	category: "Stereo",
	name: "pan - showcase",
	desc: "Ping-pong delay with alternating pan",
	code: `clock(120)
  .seq("c4 ~ e4 ~ g4 ~ c5 ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.1 }))
      .pan({ pan: sin(0.5, -0.8, 0.8) })
      .delay({ time: 0.15, feedback: 0.4, mix: 0.35 })
      .out()
  )`,
};

export const panTests = [panDefault, panAllParams, panModPan, panShowcase];
