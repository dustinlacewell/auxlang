/**
 * kick - 808-style kick drum synthesizer
 *
 * Inputs:
 *   trig: signal (default: 0) - trigger impulse
 *   pitch: number (default: 50) - base pitch in Hz
 *   sweep: number (default: 4) - pitch sweep ratio
 *   decay: number (default: 0.3) - amplitude decay time
 *   click: number (default: 0.3) - transient click amount 0-1
 *
 * Outputs:
 *   audio: synthesized kick drum
 */

import type { TestDefinition } from "../types";

export const kickDefault: TestDefinition = {
	id: "kick-default",
	category: "Drums",
	name: "kick - defaults",
	desc: "Basic kick on quarter notes",
	code: `clock(120).seq("c4 c4 c4 c4").trig.kick().out()`,
};

export const kickAllParams: TestDefinition = {
	id: "kick-all-params",
	category: "Drums",
	name: "kick - all params",
	desc: "Deep kick with long decay and high click",
	code: `clock(120).seq("c4 ~ c4 ~").trig.kick({ pitch: 40, sweep: 6, decay: 0.5, click: 0.6 }).out()`,
};

export const kickModPitch: TestDefinition = {
	id: "kick-mod-pitch",
	category: "Drums",
	name: "kick - modulated pitch",
	desc: "Kick with rising pitch per beat",
	code: `clock(120).seq("c4 c4 c4 c4").apply(s =>
  s.trig.kick({ pitch: sin(0.25, 40, 80) }).out()
)`,
};

export const kickModDecay: TestDefinition = {
	id: "kick-mod-decay",
	category: "Drums",
	name: "kick - modulated decay",
	desc: "Kick with varying decay",
	code: `clock(120).seq("c4 c4 c4 c4").apply(s =>
  s.trig.kick({ decay: sin(0.5, 0.1, 0.5) }).out()
)`,
};

export const kickModSweep: TestDefinition = {
	id: "kick-mod-sweep",
	category: "Drums",
	name: "kick - modulated sweep",
	desc: "Kick with varying pitch sweep",
	code: `clock(120).seq("c4 c4 c4 c4").apply(s =>
  s.trig.kick({ sweep: sin(0.25, 2, 8) }).out()
)`,
};

export const kickModClick: TestDefinition = {
	id: "kick-mod-click",
	category: "Drums",
	name: "kick - modulated click",
	desc: "Kick with varying click amount",
	code: `clock(120).seq("c4 c4 c4 c4").apply(s =>
  s.trig.kick({ click: sin(0.5, 0, 0.8) }).out()
)`,
};

export const kickShowcase: TestDefinition = {
	id: "kick-showcase",
	category: "Drums",
	name: "kick - showcase",
	desc: "Four-on-the-floor kick pattern",
	code: `clock(120).seq("c4*4").trig.kick({ pitch: 50, sweep: 4, decay: 0.3 }).out()`,
};

export const kickTests = [kickDefault, kickAllParams, kickModPitch, kickModDecay, kickModSweep, kickModClick, kickShowcase];
