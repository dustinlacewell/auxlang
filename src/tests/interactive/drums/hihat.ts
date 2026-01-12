/**
 * hihat - Hi-hat synthesizer
 *
 * Inputs:
 *   trig: signal (default: 0) - trigger impulse
 *   decay: number (default: 0.05) - envelope decay time
 *   tone: number (default: 0.6) - highpass frequency 0-1
 *   metal: number (default: 0.5) - metallic vs noise balance 0-1
 *
 * Outputs:
 *   audio: synthesized hi-hat
 */

import type { TestDefinition } from "../types";

export const hihatDefault: TestDefinition = {
	id: "hihat-default",
	category: "Drums",
	name: "hihat - defaults",
	desc: "Basic hi-hat on 8th notes",
	code: `clock(120).seq("c4*2").trig.hihat().out()`,
};

export const hihatAllParams: TestDefinition = {
	id: "hihat-all-params",
	category: "Drums",
	name: "hihat - all params",
	desc: "Bright metallic hi-hat",
	code: `clock(120).seq("c4*2").trig.hihat({ decay: 0.04, tone: 0.8, metal: 0.7 }).out()`,
};

export const hihatModDecay: TestDefinition = {
	id: "hihat-mod-decay",
	category: "Drums",
	name: "hihat - modulated decay",
	desc: "Open/closed hi-hat pattern",
	code: `clock(120).seq("c4*4").apply(s =>
  s.trig.hihat({ decay: lfo(0.5, 0.03, 0.2) }).out()
)`,
};

export const hihatModTone: TestDefinition = {
	id: "hihat-mod-tone",
	category: "Drums",
	name: "hihat - modulated tone",
	desc: "Hi-hat brightness sweep",
	code: `clock(120).seq("c4*4").apply(s =>
  s.trig.hihat({ tone: lfo(0.25, 0.3, 0.9) }).out()
)`,
};

export const hihatModMetal: TestDefinition = {
	id: "hihat-mod-metal",
	category: "Drums",
	name: "hihat - modulated metal",
	desc: "Metallic to noisy transition",
	code: `clock(120).seq("c4*4").apply(s =>
  s.trig.hihat({ metal: lfo(0.5, 0.2, 0.9) }).out()
)`,
};

export const hihatShowcase: TestDefinition = {
	id: "hihat-showcase",
	category: "Drums",
	name: "hihat - showcase",
	desc: "16th note hi-hat pattern",
	code: `clock(120).seq("c4*4").trig.hihat({ decay: 0.03, tone: 0.7 }).out()`,
};

export const hihatTests = [hihatDefault, hihatAllParams, hihatModDecay, hihatModTone, hihatModMetal, hihatShowcase];
