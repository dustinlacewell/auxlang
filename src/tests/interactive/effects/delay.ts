/**
 * delay - Delay effect with feedback
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   time: number (default: 0.25) - delay time in seconds
 *   feedback: number (default: 0.3) - feedback amount 0-0.99
 *   mix: number (default: 0.5) - dry/wet mix 0-1
 *
 * Outputs:
 *   audio: delayed signal
 */

import type { TestDefinition } from "../types";

export const delayDefault: TestDefinition = {
	id: "delay-default",
	category: "Effects",
	name: "delay - defaults",
	desc: "Single hit with default delay",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.2 }) }).delay().out()
)`,
};

export const delayAllParams: TestDefinition = {
	id: "delay-all-params",
	category: "Effects",
	name: "delay - all params",
	desc: "Slapback delay with high feedback",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.2 }) }).delay({ time: 0.15, feedback: 0.6, mix: 0.5 }).out()
)`,
};

export const delayModTime: TestDefinition = {
	id: "delay-mod-time",
	category: "Effects",
	name: "delay - modulated time",
	desc: "Chorus-like effect with modulated delay time",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).delay({ time: lfo(0.3, 0.01, 0.03), feedback: 0.4, mix: 0.5 }).out()
)`,
};

export const delayModFeedback: TestDefinition = {
	id: "delay-mod-feedback",
	category: "Effects",
	name: "delay - modulated feedback",
	desc: "Growing feedback on single hit",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.2 }) }).delay({ time: 0.2, feedback: lfo(0.15, 0.3, 0.75), mix: 0.5 }).out()
)`,
};

export const delayModMix: TestDefinition = {
	id: "delay-mod-mix",
	category: "Effects",
	name: "delay - modulated mix",
	desc: "Delay mix sweep",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.01, release: 0.2 }) }).delay({ time: 0.25, feedback: 0.5, mix: lfo(0.2, 0.1, 0.9) }).out()
)`,
};

export const delayShowcase: TestDefinition = {
	id: "delay-showcase",
	category: "Effects",
	name: "delay - showcase",
	desc: "Dub delay with filter",
	code: `clock(60).seq("c3 ~ ~ ~").apply(s =>
  s.cv.saw().lpf({ cutoff: 800 }).gain({ level: s.gate.env({ attack: 0.01, release: 0.3 }) }).delay({ time: 0.375, feedback: 0.65, mix: 0.5 }).lpf({ cutoff: 2500 }).out()
)`,
};

export const delayTests = [delayDefault, delayAllParams, delayModTime, delayModFeedback, delayModMix, delayShowcase];
