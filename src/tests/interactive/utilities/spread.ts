/**
 * spread - Distribute poly voices across stereo field
 *
 * Inputs:
 *   input: signal (default: 0) - poly input
 *   width: number (default: 1) - stereo width (-1 to 1)
 *
 * Outputs:
 *   out: stereo pair (left/right)
 */

import type { TestDefinition } from "../types";

export const spreadDefault: TestDefinition = {
	id: "spread-default",
	category: "Utilities",
	name: "spread - defaults",
	desc: "3-voice chord spread across stereo",
	code: `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr() }).spread().out()
)`,
};

export const spreadAllParams: TestDefinition = {
	id: "spread-all-params",
	category: "Utilities",
	name: "spread - all params",
	desc: "Narrow spread (closer to center)",
	code: `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr() }).spread({ width: 0.3 }).out()
)`,
};

export const spreadModWidth: TestDefinition = {
	id: "spread-mod-width",
	category: "Utilities",
	name: "spread - modulated width",
	desc: "Width panning with LFO",
	code: `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr() }).spread({ width: lfo(0.2, -1, 1) }).out()
)`,
};

export const spreadShowcase: TestDefinition = {
	id: "spread-showcase",
	category: "Utilities",
	name: "spread - showcase",
	desc: "Wide arpeggio with stereo spread",
	code: `clock(180).seq("{c4,e4,g4,b4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 2000 }).gain({ level: s.gate.env({ attack: 0.01, release: 0.15 }) }).spread().out()
)`,
};

export const spreadTests = [spreadDefault, spreadAllParams, spreadModWidth, spreadShowcase];
