/**
 * tape - Tape delay with wow, flutter, and saturation
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   time: number (default: 0.3) - delay time in seconds
 *   feedback: number (default: 0.4) - feedback amount 0-0.98
 *   mix: number (default: 0.5) - dry/wet mix 0-1
 *   wow: number (default: 0.3) - slow pitch drift depth 0-1
 *   flutter: number (default: 0.2) - fast pitch wobble depth 0-1
 *   saturation: number (default: 0.3) - tape saturation 0-1
 *   tone: number (default: 0.7) - HF rolloff (0=dark, 1=bright)
 *   age: number (default: 0) - tape wear/noise 0-1
 *
 * Outputs:
 *   audio: tape-processed signal
 */

import type { TestDefinition } from "../types";

export const tapeDefault: TestDefinition = {
	id: "tape-default",
	category: "Effects",
	name: "tape - defaults",
	desc: "Single hit with warm tape delay",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.2 }) }).tape().out()
)`,
};

export const tapeAllParams: TestDefinition = {
	id: "tape-all-params",
	category: "Effects",
	name: "tape - all params",
	desc: "Vintage degraded tape",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).tape({ time: 0.35, feedback: 0.55, mix: 0.5, wow: 0.5, flutter: 0.3, saturation: 0.5, tone: 0.5, age: 0.2 }).out()
)`,
};

export const tapeModTime: TestDefinition = {
	id: "tape-mod-time",
	category: "Effects",
	name: "tape - modulated time",
	desc: "Pitch-shifting tape effect",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.4 }) }).tape({ time: lfo(0.3, 0.1, 0.25), feedback: 0.5, wow: 0.1, flutter: 0.1 }).out()
)`,
};

export const tapeModFeedback: TestDefinition = {
	id: "tape-mod-feedback",
	category: "Effects",
	name: "tape - modulated feedback",
	desc: "Building tape echo",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.2 }) }).tape({ time: 0.25, feedback: lfo(0.1, 0.3, 0.75) }).out()
)`,
};

export const tapeModWow: TestDefinition = {
	id: "tape-mod-wow",
	category: "Effects",
	name: "tape - modulated wow",
	desc: "Varying tape wobble",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).tape({ wow: lfo(0.2, 0.1, 0.7), flutter: 0.15, feedback: 0.5 }).out()
)`,
};

export const tapeModSaturation: TestDefinition = {
	id: "tape-mod-saturation",
	category: "Effects",
	name: "tape - modulated saturation",
	desc: "Saturation sweep",
	code: `clock(60).seq("c3 ~ ~ ~").apply(s =>
  s.cv.saw().gain({ level: s.gate.env({ attack: 0.01, release: 0.5 }) }).tape({ saturation: lfo(0.15, 0.1, 0.8), feedback: 0.4, mix: 0.6 }).out()
)`,
};

export const tapeModTone: TestDefinition = {
	id: "tape-mod-tone",
	category: "Effects",
	name: "tape - modulated tone",
	desc: "Tape brightness sweep",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).tape({ tone: lfo(0.15, 0.2, 0.9), feedback: 0.5 }).out()
)`,
};

export const tapeShowcase: TestDefinition = {
	id: "tape-showcase",
	category: "Effects",
	name: "tape - showcase",
	desc: "Lo-fi tape slapback on bass",
	code: `clock(60).seq("c3 ~ ~ ~").apply(s =>
  s.cv.saw().lpf({ cutoff: 600 }).gain({ level: s.gate.env({ attack: 0.01, release: 0.4 }) }).tape({ time: 0.18, feedback: 0.5, saturation: 0.6, tone: 0.4, wow: 0.35 }).out()
)`,
};

export const tapeTests = [tapeDefault, tapeAllParams, tapeModTime, tapeModFeedback, tapeModWow, tapeModSaturation, tapeModTone, tapeShowcase];
