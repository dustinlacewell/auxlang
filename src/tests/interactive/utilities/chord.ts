/**
 * chord - Generate chord frequencies from root
 *
 * Inputs:
 *   root: signal (default: 261.63) - root frequency
 *
 * Config:
 *   chordName: string (default: "maj") - chord type
 *
 * Outputs:
 *   freq: poly frequencies for chord tones
 */

import type { TestDefinition } from "../types";

export const chordDefault: TestDefinition = {
	id: "chord-default",
	category: "Utilities",
	name: "chord - defaults",
	desc: "C major chord (default)",
	code: `chord(261.63).tri().gain(0.3).spread().out()`,
};

export const chordAllParams: TestDefinition = {
	id: "chord-all-params",
	category: "Utilities",
	name: "chord - all params",
	desc: "A minor 7th chord",
	code: `chord(220, "min7").tri().gain(0.3).spread().out()`,
};

export const chordModRoot: TestDefinition = {
	id: "chord-mod-root",
	category: "Utilities",
	name: "chord - modulated root",
	desc: "Chord with LFO-swept root",
	code: `chord(sin(0.2, 200, 300), "maj").tri().gain(0.3).spread().out()`,
};

export const chordShowcase: TestDefinition = {
	id: "chord-showcase",
	category: "Utilities",
	name: "chord - showcase",
	desc: "Chord progression from sequencer",
	code: `clock(30).seq("c3 f3 g3 c3").apply(s =>
  s.cv.chord("maj7").tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.2, release: 0.5 }) }).spread().out()
)`,
};

export const chordTests = [chordDefault, chordAllParams, chordModRoot, chordShowcase];
