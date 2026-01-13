/**
 * gain - Multiply signal by level
 *
 * Inputs:
 *   input: signal (default: 0) - audio input
 *   level: number (default: 1) - gain multiplier
 *
 * Outputs:
 *   signal: scaled signal
 */

import type { TestDefinition } from "../types";

export const gainDefault: TestDefinition = {
	id: "gain-default",
	category: "Utilities",
	name: "gain - defaults",
	desc: "Unity gain (passthrough)",
	code: `saw(220).gain().out()`,
};

export const gainAllParams: TestDefinition = {
	id: "gain-all-params",
	category: "Utilities",
	name: "gain - all params",
	desc: "Half volume",
	code: `saw(220).gain({ level: 0.5 }).out()`,
};

export const gainModLevel: TestDefinition = {
	id: "gain-mod-level",
	category: "Utilities",
	name: "gain - modulated level",
	desc: "Tremolo effect with LFO",
	code: `saw(220).gain({ level: sin(4, 0.3, 1) }).out()`,
};

export const gainShowcase: TestDefinition = {
	id: "gain-showcase",
	category: "Utilities",
	name: "gain - showcase",
	desc: "Envelope-controlled amplitude",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.saw().gain({ level: s.gate.adsr() }).out()
)`,
};

export const gainTests = [gainDefault, gainAllParams, gainModLevel, gainShowcase];
