/**
 * saw - Sawtooth oscillator
 *
 * Inputs:
 *   freq: number (default: 440) - oscillator frequency
 *
 * Outputs:
 *   audio: -1 to 1 sawtooth wave
 */

import type { TestDefinition } from "../types";

// Default: saw with spec defaults
export const sawDefault: TestDefinition = {
	id: "saw-default",
	category: "Oscillators",
	name: "saw - defaults",
	desc: "Sawtooth at 440Hz (spec default)",
	code: `saw().out()`,
};

// All params: explicit freq
export const sawAllParams: TestDefinition = {
	id: "saw-all-params",
	category: "Oscillators",
	name: "saw - all params",
	desc: "Sawtooth at 220Hz (explicit)",
	code: `saw(220).out()`,
};

// Modulated: freq from LFO
export const sawModFreq: TestDefinition = {
	id: "saw-mod-freq",
	category: "Oscillators",
	name: "saw - modulated freq",
	desc: "Sawtooth with LFO-modulated frequency",
	code: `saw(sin(2, 200, 400)).out()`,
};

// Showcase: sequenced saw with envelope
export const sawShowcase: TestDefinition = {
	id: "saw-showcase",
	category: "Oscillators",
	name: "saw - showcase",
	desc: "Sequenced saw with envelope",
	code: `clock(120).seq("c3 e3 g3 c4").apply(s =>
  s.cv.saw().gain({ level: s.gate.adsr() }).out()
)`,
};

export const sawTests = [sawDefault, sawAllParams, sawModFreq, sawShowcase];
