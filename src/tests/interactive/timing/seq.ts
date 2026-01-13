/**
 * seq - Sequencer with pattern syntax
 *
 * Config:
 *   pattern: string - mini-notation pattern
 *
 * Inputs:
 *   clk: signal - clock input (from clock device)
 *
 * Outputs:
 *   cv: pitch CV in Hz
 *   gate: gate signal (high while note active)
 *   trig: trigger impulse on note start
 */

import type { TestDefinition } from "../types";

export const seqDefault: TestDefinition = {
	id: "seq-default",
	category: "Timing",
	name: "seq - defaults",
	desc: "Simple 4-note sequence",
	code: `clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.tri().gain({ level: s.gate.ar() }).out()
)`,
};

export const seqRests: TestDefinition = {
	id: "seq-rests",
	category: "Timing",
	name: "seq - rests",
	desc: "Sequence with rests",
	code: `clock(120).seq("c4 ~ e4 ~").apply(s =>
  s.cv.tri().gain({ level: s.gate.ar() }).out()
)`,
};

export const seqMultiply: TestDefinition = {
	id: "seq-multiply",
	category: "Timing",
	name: "seq - multiply",
	desc: "Subdivided notes with * (4 fast, 2 medium, 1 slow)",
	code: `clock(60).seq("c4*4 e4*2 g4").apply(s =>
  s.cv.tri().gain({ level: s.gate.ar({ attack: 0.01, release: 0.05 }) }).out()
)`,
};

export const seqReplicate: TestDefinition = {
	id: "seq-replicate",
	category: "Timing",
	name: "seq - replicate",
	desc: "Repeated notes with ! (4 separate beats)",
	code: `clock(120).seq("c4!4 e4!2 g4!2").apply(s =>
  s.cv.tri().gain({ level: s.gate.ar() }).out()
)`,
};

export const seqElongate: TestDefinition = {
	id: "seq-elongate",
	category: "Timing",
	name: "seq - elongate",
	desc: "Held notes with @",
	code: `clock(120).seq("c4@4 e4@2 g4 c5").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr({ attack: 0.1, release: 0.3 }) }).out()
)`,
};

export const seqGroups: TestDefinition = {
	id: "seq-groups",
	category: "Timing",
	name: "seq - groups",
	desc: "Grouped subdivisions with []",
	code: `clock(120).seq("[c4 e4] [g4 c5] e4 c4").apply(s =>
  s.cv.tri().gain({ level: s.gate.ar() }).out()
)`,
};

export const seqAlternate: TestDefinition = {
	id: "seq-alternate",
	category: "Timing",
	name: "seq - alternate",
	desc: "Alternating notes with <>",
	code: `clock(120).seq("<c4 e4> <g4 c5>").apply(s =>
  s.cv.tri().gain({ level: s.gate.ar() }).out()
)`,
};

export const seqEuclidean: TestDefinition = {
	id: "seq-euclidean",
	category: "Timing",
	name: "seq - euclidean",
	desc: "Euclidean rhythm (3 hits in 8 steps)",
	code: `clock(120).seq("c4(3,8)").trig.kick().out()`,
};

export const seqPoly: TestDefinition = {
	id: "seq-poly",
	category: "Timing",
	name: "seq - poly",
	desc: "Polyphonic chord pattern",
	code: `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr() }).out()
)`,
};

export const seqShowcase: TestDefinition = {
	id: "seq-showcase",
	category: "Timing",
	name: "seq - showcase",
	desc: "Complex pattern with multiple features",
	code: `clock(120).seq("[c4 e4]*2 g4@2 <c5 b4>").apply(s =>
  s.cv.tri().lpf({ cutoff: 1500 }).gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 }) }).out()
)`,
};

export const seqTests = [seqDefault, seqRests, seqMultiply, seqReplicate, seqElongate, seqGroups, seqAlternate, seqEuclidean, seqPoly, seqShowcase];
