/**
 * delay - Delay effect with feedback and tone control
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   time: number (default: 0.25) - delay time in seconds
 *   feedback: number (default: 0.3) - feedback amount 0-0.99
 *   mix: number (default: 0.5) - dry/wet mix 0-1
 *   tone: number (default: 0.7) - feedback brightness (0=dark, 1=bright)
 *
 * Outputs:
 *   audio: delayed signal
 *
 * Note: Use ad() for plucky sounds to avoid sustained signal in delay buffer.
 * The tone parameter applies lowpass filtering in the feedback path.
 */

import type { TestDefinition } from "../types";

export const delayDefault: TestDefinition = {
	id: "delay-default",
	category: "Effects",
	name: "delay - defaults",
	desc: "Plucky hit with default delay",
	code: `clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay()
      .out()
  )`,
};

export const delayAllParams: TestDefinition = {
	id: "delay-all-params",
	category: "Effects",
	name: "delay - all params",
	desc: "All params specified - longer, darker delay",
	code: `clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay({
        time: 0.3,
        feedback: 0.55,
        mix: 0.45,
        tone: 0.4
      })
      .out()
  )`,
};

export const delayModTime: TestDefinition = {
	id: "delay-mod-time",
	category: "Effects",
	name: "delay - modulated time",
	desc: "Delay time varies 0.01s to 0.03s - chorus effect",
	code: `clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
      .delay({
        time: sin(0.3, 0.01, 0.03),
        feedback: 0.4,
        mix: 0.5
      })
      .out()
  )`,
};

export const delayModFeedback: TestDefinition = {
	id: "delay-mod-feedback",
	category: "Effects",
	name: "delay - modulated feedback",
	desc: "Feedback varies 0.3 to 0.75",
	code: `clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay({
        time: 0.2,
        feedback: sin(0.15, 0.3, 0.75),
        mix: 0.5
      })
      .out()
  )`,
};

export const delayModMix: TestDefinition = {
	id: "delay-mod-mix",
	category: "Effects",
	name: "delay - modulated mix",
	desc: "Mix varies 0.1 to 0.9 - dry to wet sweep",
	code: `clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay({
        time: 0.25,
        feedback: 0.5,
        mix: sin(0.2, 0.1, 0.9)
      })
      .out()
  )`,
};

export const delayModTone: TestDefinition = {
	id: "delay-mod-tone",
	category: "Effects",
	name: "delay - modulated tone",
	desc: "Tone varies 0.1 to 0.9 - dark to bright feedback",
	code: `clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay({
        time: 0.25,
        feedback: 0.55,
        mix: 0.5,
        tone: sin(0.15, 0.1, 0.9)
      })
      .out()
  )`,
};

export const delayShowcase: TestDefinition = {
	id: "delay-showcase",
	category: "Effects",
	name: "delay - showcase",
	desc: "Melodic sequence with rhythmic dub delay",
	code: `clock(120)
  .seq("c4 e4 g4 ~ c5 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(2000)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .delay({
        time: 0.25,
        feedback: 0.5,
        mix: 0.4,
        tone: 0.4
      })
      .out()
  )`,
};

export const delayTests = [
	delayDefault,
	delayAllParams,
	delayModTime,
	delayModFeedback,
	delayModMix,
	delayModTone,
	delayShowcase,
];
