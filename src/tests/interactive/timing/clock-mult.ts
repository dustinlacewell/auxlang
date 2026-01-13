/**
 * clockMult - Clock multiplier
 *
 * Inputs:
 *   trig: signal (default: 0) - input trigger
 *   by: number (default: 2) - multiplication factor
 *
 * Outputs:
 *   trig: multiplied trigger output
 *   gate: gate signal
 */

import type { TestDefinition } from "../types";

export const clockMultDefault: TestDefinition = {
	id: "clockmult-default",
	category: "Timing",
	name: "clockMult - defaults",
	desc: "Multiply clock by 2",
	code: `clock(60).apply(c =>
  clockMult(c).seq("c4 e4").apply(s =>
    s.cv.saw().gain({ level: s.gate.ar() }).out()
  )
)`,
};

export const clockMultAllParams: TestDefinition = {
	id: "clockmult-all-params",
	category: "Timing",
	name: "clockMult - all params",
	desc: "Multiply clock by 4",
	code: `clock(60).apply(c =>
  clockMult(c).by(4).seq("c4 e4 g4 c5").apply(s =>
    s.cv.saw().gain({ level: s.gate.ar() }).out()
  )
)`,
};

export const clockMultModBy: TestDefinition = {
	id: "clockmult-mod-by",
	category: "Timing",
	name: "clockMult - modulated by",
	desc: "Varying multiplication factor",
	code: `clock(60).apply(c =>
  clockMult(c).by(sin(0.1, 1, 4)).seq("c4").gate.hihat().out()
)`,
};

export const clockMultShowcase: TestDefinition = {
	id: "clockmult-showcase",
	category: "Timing",
	name: "clockMult - showcase",
	desc: "Fast arpeggio from slow clock",
	code: `clock(30).apply(c =>
  clockMult(c).by(8).seq("c4 e4 g4 b4 c5 b4 g4 e4").apply(s =>
    s.cv.tri().gain({ level: s.gate.ar({ attack: 0.01, release: 0.05 }) }).out()
  )
)`,
};

export const clockMultTests = [clockMultDefault, clockMultAllParams, clockMultModBy, clockMultShowcase];
