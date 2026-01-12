/**
 * mix - Mix up to 4 signals with auto-scaling
 *
 * Inputs:
 *   a: signal (default: 0) - first input
 *   b: signal (default: 0) - second input
 *   c: signal (default: 0) - third input
 *   d: signal (default: 0) - fourth input
 *
 * Outputs:
 *   signal: mixed and scaled signal
 */

import type { TestDefinition } from "../types";

export const mixDefault: TestDefinition = {
	id: "mix-default",
	category: "Utilities",
	name: "mix - defaults",
	desc: "Mix saw and slightly detuned sin for beating",
	code: `mix({ a: sin(220), b: sin(222) }).out()`,
};

export const mixAllParams: TestDefinition = {
	id: "mix-all-params",
	category: "Utilities",
	name: "mix - all params",
	desc: "Mix four different waveforms at different octaves",
	code: `mix({ a: sin(110), b: tri(220), c: saw(440).lpf({ cutoff: 1000 }), d: sqr(880).gain(0.3) }).out()`,
};

export const mixModA: TestDefinition = {
	id: "mix-mod-a",
	category: "Utilities",
	name: "mix - modulated input",
	desc: "Mix sequenced synth with subtle noise texture",
	code: `clock(60).seq("c4 e4 g4 c5").apply(s =>
  mix({
    a: s.cv.tri().gain({ level: s.gate.adsr() }),
    b: noise().lpf({ cutoff: 500 }).gain(0.05)
  }).out()
)`,
};

export const mixShowcase: TestDefinition = {
	id: "mix-showcase",
	category: "Utilities",
	name: "mix - showcase",
	desc: "Layered pad with filtered saw and pure sine",
	code: `clock(60).seq("{c3,e3,g3}").apply(s =>
  mix({
    a: s.cv.saw().lpf({ cutoff: 600 }),
    b: s.cv.sin()
  }).gain({ level: s.gate.adsr({ attack: 0.2, release: 0.5 }) }).out()
)`,
};

export const mixTests = [mixDefault, mixAllParams, mixModA, mixShowcase];
