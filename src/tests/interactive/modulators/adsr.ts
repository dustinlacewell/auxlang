/**
 * adsr - ADSR envelope generator
 *
 * Inputs:
 *   gate: signal (default: 0) - gate signal (>0.5 = on)
 *   attack: number (default: 0.01) - attack time in seconds
 *   decay: number (default: 0.1) - decay time in seconds
 *   sustain: number (default: 0.7) - sustain level 0-1
 *   release: number (default: 0.3) - release time in seconds
 *
 * Outputs:
 *   cv: envelope output 0-1
 */

import type { TestDefinition } from "../types";

export const adsrDefault: TestDefinition = {
	id: "adsr-default",
	category: "Modulators",
	name: "adsr - defaults",
	desc: "Single hit with default ADSR",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr() }).out()
)`,
};

export const adsrAllParams: TestDefinition = {
	id: "adsr-all-params",
	category: "Modulators",
	name: "adsr - all params",
	desc: "Plucky envelope with fast attack, short decay",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.4 }) }).out()
)`,
};

export const adsrModAttack: TestDefinition = {
	id: "adsr-mod-attack",
	category: "Modulators",
	name: "adsr - modulated attack",
	desc: "Varying attack time (0.05 to 0.5s)",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr({ attack: lfo(0.1, 0.05, 0.5), sustain: 0.7, release: 0.5 }) }).out()
)`,
};

export const adsrModDecay: TestDefinition = {
	id: "adsr-mod-decay",
	category: "Modulators",
	name: "adsr - modulated decay",
	desc: "Varying decay time (0.1 to 0.6s)",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr({ attack: 0.01, decay: lfo(0.15, 0.1, 0.6), sustain: 0.3, release: 0.4 }) }).out()
)`,
};

export const adsrModSustain: TestDefinition = {
	id: "adsr-mod-sustain",
	category: "Modulators",
	name: "adsr - modulated sustain",
	desc: "Varying sustain level (0.2 to 0.9)",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr({ attack: 0.15, decay: 0.2, sustain: lfo(0.2, 0.2, 0.9), release: 0.5 }) }).out()
)`,
};

export const adsrModRelease: TestDefinition = {
	id: "adsr-mod-release",
	category: "Modulators",
	name: "adsr - modulated release",
	desc: "Varying release time (0.2 to 1s)",
	code: `clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: lfo(0.15, 0.2, 1) }) }).out()
)`,
};

export const adsrShowcase: TestDefinition = {
	id: "adsr-showcase",
	category: "Modulators",
	name: "adsr - showcase",
	desc: "Filter envelope on bass",
	code: `clock(60).seq("c2 ~ ~ ~").apply(s =>
  s.cv.saw()
    .lpf({ cutoff: s.gate.adsr({ attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.5 }).scale({ from: 0, to: 1, min: 100, max: 3000 }) })
    .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.8 }) })
    .out()
)`,
};

export const adsrTests = [adsrDefault, adsrAllParams, adsrModAttack, adsrModDecay, adsrModSustain, adsrModRelease, adsrShowcase];
