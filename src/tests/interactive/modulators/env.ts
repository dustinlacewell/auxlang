/**
 * env - Simple AR envelope generator
 *
 * Inputs:
 *   gate: signal (default: 0) - gate signal (>0.5 = on)
 *   attack: number (default: 0.01) - attack time in seconds
 *   release: number (default: 0.1) - release time in seconds
 *
 * Outputs:
 *   cv: envelope output 0-1
 */

import type { TestDefinition } from "../types";

export const envDefault: TestDefinition = {
	id: "env-default",
	category: "Modulators",
	name: "env - defaults",
	desc: "Simple AR envelope",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.saw().gain({ level: s.gate.env() }).out()
)`,
};

export const envAllParams: TestDefinition = {
	id: "env-all-params",
	category: "Modulators",
	name: "env - all params",
	desc: "Percussive AR envelope",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.sqr().gain({ level: s.gate.env({ attack: 0.001, release: 0.05 }) }).out()
)`,
};

export const envModAttack: TestDefinition = {
	id: "env-mod-attack",
	category: "Modulators",
	name: "env - modulated attack",
	desc: "Varying attack time",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.saw().gain({ level: s.gate.env({ attack: lfo(0.25, 0.001, 0.1) }) }).out()
)`,
};

export const envModRelease: TestDefinition = {
	id: "env-mod-release",
	category: "Modulators",
	name: "env - modulated release",
	desc: "Varying release time",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.saw().gain({ level: s.gate.env({ release: lfo(0.25, 0.03, 0.3) }) }).out()
)`,
};

export const envShowcase: TestDefinition = {
	id: "env-showcase",
	category: "Modulators",
	name: "env - showcase",
	desc: "Plucky staccato melody",
	code: `clock(240).seq("c4 e4 g4 b4 c5 b4 g4 e4").apply(s =>
  s.cv.tri().gain({ level: s.gate.env({ attack: 0.001, release: 0.08 }) }).out()
)`,
};

export const envTests = [envDefault, envAllParams, envModAttack, envModRelease, envShowcase];
