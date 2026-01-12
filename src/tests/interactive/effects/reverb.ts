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
 */

import type { TestDefinition } from "../types";

export const reverbDefault: TestDefinition = {
	id: "reverb-default",
	category: "Effects",
	name: "reverb - defaults",
	desc: "Single hit with default reverb",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.2 }) }).reverb().out()
)`,
};

export const reverbAllParams: TestDefinition = {
	id: "reverb-all-params",
	category: "Effects",
	name: "reverb - all params",
	desc: "Large hall with high damping",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).reverb({ room: 0.9, damp: 0.7, mix: 0.6 }).out()
)`,
};

export const reverbModRoom: TestDefinition = {
	id: "reverb-mod-room",
	category: "Effects",
	name: "reverb - modulated room",
	desc: "Expanding room size",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).reverb({ room: lfo(0.1, 0.3, 0.95), mix: 0.5 }).out()
)`,
};

export const reverbModDamp: TestDefinition = {
	id: "reverb-mod-damp",
	category: "Effects",
	name: "reverb - modulated damp",
	desc: "Varying reverb brightness",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).reverb({ room: 0.8, damp: lfo(0.15, 0.1, 0.9), mix: 0.5 }).out()
)`,
};

export const reverbModMix: TestDefinition = {
	id: "reverb-mod-mix",
	category: "Effects",
	name: "reverb - modulated mix",
	desc: "Reverb swell",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).reverb({ room: 0.7, mix: lfo(0.2, 0.1, 0.8) }).out()
)`,
};

export const reverbShowcase: TestDefinition = {
	id: "reverb-showcase",
	category: "Effects",
	name: "reverb - showcase",
	desc: "Ambient chord hit with lush reverb",
	code: `clock(60).seq("{c4,e4,g4} ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.1, release: 0.8 }) }).reverb({ room: 0.9, damp: 0.3, mix: 0.6 }).out()
)`,
};

export const reverbTests = [reverbDefault, reverbAllParams, reverbModRoom, reverbModDamp, reverbModMix, reverbShowcase];
