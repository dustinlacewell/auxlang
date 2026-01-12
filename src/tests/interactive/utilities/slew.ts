/**
 * slew - Slew limiter / lag processor
 *
 * Inputs:
 *   input: signal (default: 0) - input signal
 *   rise: number (default: 0.1) - rise time in seconds
 *   fall: number (default: 0.1) - fall time in seconds
 *
 * Outputs:
 *   signal: slewed signal
 */

import type { TestDefinition } from "../types";

export const slewDefault: TestDefinition = {
	id: "slew-default",
	category: "Utilities",
	name: "slew - defaults",
	desc: "Portamento on sequencer",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.slew().saw().out()
)`,
};

export const slewAllParams: TestDefinition = {
	id: "slew-all-params",
	category: "Utilities",
	name: "slew - all params",
	desc: "Asymmetric slew (fast up, slow down)",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.slew({ rise: 0.01, fall: 0.3 }).saw().out()
)`,
};

export const slewModRise: TestDefinition = {
	id: "slew-mod-rise",
	category: "Utilities",
	name: "slew - modulated rise",
	desc: "Varying portamento speed",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.slew({ rise: lfo(0.25, 0.01, 0.2), fall: 0.1 }).saw().out()
)`,
};

export const slewModFall: TestDefinition = {
	id: "slew-mod-fall",
	category: "Utilities",
	name: "slew - modulated fall",
	desc: "Varying fall time",
	code: `clock(120).seq("c5 g4 e4 c4").apply(s =>
  s.cv.slew({ rise: 0.01, fall: lfo(0.25, 0.01, 0.3) }).saw().out()
)`,
};

export const slewShowcase: TestDefinition = {
	id: "slew-showcase",
	category: "Utilities",
	name: "slew - showcase",
	desc: "Glide bass line",
	code: `clock(120).seq("c2 c2 eb2 g2").apply(s =>
  s.cv.slew({ rise: 0.05, fall: 0.05 }).saw().lpf({ cutoff: 500 }).out()
)`,
};

export const slewTests = [slewDefault, slewAllParams, slewModRise, slewModFall, slewShowcase];
