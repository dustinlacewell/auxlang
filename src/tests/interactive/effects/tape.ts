/**
 * tape - Tape delay with wow, flutter, and saturation
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   time: number (default: 0.3) - delay time in seconds
 *   feedback: number (default: 0.4) - feedback amount 0-0.95
 *   mix: number (default: 0.5) - dry/wet mix 0-1
 *   wow: number (default: 0.3) - slow pitch drift depth 0-1
 *   flutter: number (default: 0.2) - fast pitch wobble depth 0-1
 *   saturation: number (default: 0.3) - tape saturation 0-1
 *   tone: number (default: 0.7) - HF rolloff (0=dark, 1=bright)
 *   age: number (default: 0) - tape wear/noise 0-1
 *
 * Outputs:
 *   audio: tape-processed signal
 *
 * Note: Use ad() for plucky sounds feeding into tape delay.
 */

import type { TestDefinition } from "../types";

export const tapeDefault: TestDefinition = {
	id: "tape-default",
	category: "Effects",
	name: "tape - defaults",
	desc: "Plucky hit with warm tape character",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape()
      .out()
  )`,
};

export const tapeAllParams: TestDefinition = {
	id: "tape-all-params",
	category: "Effects",
	name: "tape - all params",
	desc: "All params specified - vintage degraded tape",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        time: 0.35,
        feedback: 0.5,
        mix: 0.5,
        wow: 0.5,
        flutter: 0.3,
        saturation: 0.5,
        tone: 0.4,
        age: 0.3
      })
      .out()
  )`,
};

export const tapeModTime: TestDefinition = {
	id: "tape-mod-time",
	category: "Effects",
	name: "tape - modulated time",
	desc: "Delay time varies 0.1s to 0.4s - pitch shifts",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        time: sin(0.2, 0.1, 0.4),
        feedback: 0.45,
        wow: 0.1,
        flutter: 0.1
      })
      .out()
  )`,
};

export const tapeModFeedback: TestDefinition = {
	id: "tape-mod-feedback",
	category: "Effects",
	name: "tape - modulated feedback",
	desc: "Feedback varies 0.2 to 0.7",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        time: 0.25,
        feedback: sin(0.15, 0.2, 0.7)
      })
      .out()
  )`,
};

export const tapeModMix: TestDefinition = {
	id: "tape-mod-mix",
	category: "Effects",
	name: "tape - modulated mix",
	desc: "Mix varies 0.1 to 0.8 - dry to wet sweep",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        time: 0.3,
        feedback: 0.45,
        mix: sin(0.2, 0.1, 0.8)
      })
      .out()
  )`,
};

export const tapeModWow: TestDefinition = {
	id: "tape-mod-wow",
	category: "Effects",
	name: "tape - modulated wow",
	desc: "Wow depth varies 0.1 to 0.7 - pitch drift intensity",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        wow: sin(0.2, 0.1, 0.7),
        flutter: 0.15,
        feedback: 0.5
      })
      .out()
  )`,
};

export const tapeModFlutter: TestDefinition = {
	id: "tape-mod-flutter",
	category: "Effects",
	name: "tape - modulated flutter",
	desc: "Flutter depth varies 0.05 to 0.5 - fast wobble intensity",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        wow: 0.15,
        flutter: sin(0.2, 0.05, 0.5),
        feedback: 0.5
      })
      .out()
  )`,
};

export const tapeModSaturation: TestDefinition = {
	id: "tape-mod-saturation",
	category: "Effects",
	name: "tape - modulated saturation",
	desc: "Saturation varies 0.1 to 0.8 - clean to driven",
	code: `clock(90)
  .seq("c3 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(800)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.2 }))
      .tape({
        saturation: sin(0.15, 0.1, 0.8),
        feedback: 0.45,
        mix: 0.55
      })
      .out()
  )`,
};

export const tapeModTone: TestDefinition = {
	id: "tape-mod-tone",
	category: "Effects",
	name: "tape - modulated tone",
	desc: "Tone varies 0.2 to 0.9 - dark to bright feedback",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        tone: sin(0.15, 0.2, 0.9),
        feedback: 0.5
      })
      .out()
  )`,
};

export const tapeModAge: TestDefinition = {
	id: "tape-mod-age",
	category: "Effects",
	name: "tape - modulated age",
	desc: "Age varies 0 to 0.6 - tape wear/noise",
	code: `clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        age: sin(0.15, 0, 0.6),
        feedback: 0.45
      })
      .out()
  )`,
};

export const tapeShowcase: TestDefinition = {
	id: "tape-showcase",
	category: "Effects",
	name: "tape - showcase",
	desc: "Lo-fi dub bass with degraded tape",
	code: `clock(75)
  .seq("c2 ~ ~ ~ g2 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(600)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.25 }))
      .tape({
        time: 0.4,
        feedback: 0.55,
        saturation: 0.5,
        tone: 0.35,
        wow: 0.4,
        flutter: 0.2
      })
      .out()
  )`,
};

export const tapeTests = [
	tapeDefault,
	tapeAllParams,
	tapeModTime,
	tapeModFeedback,
	tapeModMix,
	tapeModWow,
	tapeModFlutter,
	tapeModSaturation,
	tapeModTone,
	tapeModAge,
	tapeShowcase,
];
