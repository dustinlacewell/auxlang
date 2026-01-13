/**
 * add - Add two signals
 *
 * Inputs:
 *   input: signal (default: 0) - first signal
 *   to: signal (default: 0) - second signal
 *
 * Outputs:
 *   signal: sum
 */

import type { TestDefinition } from "../types";

export const addDefault: TestDefinition = {
	id: "add-default",
	category: "Math",
	name: "add - defaults",
	desc: "Add LFO wobble to base pitch",
	code: `sin(add(330).to(sin(4, -15, 15))).out()`,
};

export const addAllParams: TestDefinition = {
	id: "add-all-params",
	category: "Math",
	name: "add - all params",
	desc: "Add two LFOs for complex modulation",
	code: `sin(add(sin(0.5, 300, 400)).to(sin(6, -30, 30))).out()`,
};

export const addModTo: TestDefinition = {
	id: "add-mod-to",
	category: "Math",
	name: "add - modulated to",
	desc: "Vibrato with growing depth",
	code: `sin(add(440).to(sin(6).mult(sin(0.2, 5, 40)))).out()`,
};

export const addShowcase: TestDefinition = {
	id: "add-showcase",
	category: "Math",
	name: "add - showcase",
	desc: "FM bell using add for modulation",
	code: `clock(60).seq("c5 e5 g5 c6").apply(s =>
  sin(add(s.cv).to(sin(s.cv.mult(2)).mult(80)))
    .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 }) })
    .out()
)`,
};

export const addTests = [addDefault, addAllParams, addModTo, addShowcase];
