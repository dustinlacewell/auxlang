/**
 * clockDiv - Clock divider
 *
 * Inputs:
 *   trig: signal (default: 0) - input trigger
 *   by: number (default: 4) - division factor
 *
 * Outputs:
 *   trig: divided trigger output
 *   gate: gate signal
 */

import type { TestDefinition } from "../types";

export const clockDivDefault: TestDefinition = {
	id: "clockdiv-default",
	category: "Timing",
	name: "clockDiv - defaults",
	desc: "Fast notes with slow kick (div by 4)",
	code: `clock(240).apply(c =>
  mix({
    a: c.seq("c5 e5 g5 c6").apply(s => s.cv.tri().gain({ level: s.gate.env() })),
    b: clockDiv(c).seq("c3").apply(s => s.cv.sin().gain({ level: s.gate.env({ release: 0.3 }) }))
  }).out()
)`,
};

export const clockDivAllParams: TestDefinition = {
	id: "clockdiv-all-params",
	category: "Timing",
	name: "clockDiv - all params",
	desc: "High arp with low bass (div by 2)",
	code: `clock(240).apply(c =>
  mix({
    a: c.seq("c5 e5").apply(s => s.cv.tri().gain({ level: s.gate.env() })),
    b: clockDiv(c).by(2).seq("c3").apply(s => s.cv.sin().gain({ level: s.gate.env({ release: 0.2 }) }))
  }).out()
)`,
};

export const clockDivModBy: TestDefinition = {
	id: "clockdiv-mod-by",
	category: "Timing",
	name: "clockDiv - modulated by",
	desc: "Varying division creates polyrhythm",
	code: `clock(240).apply(c =>
  mix({
    a: c.seq("c5 e5 g5 c6").apply(s => s.cv.tri().gain({ level: s.gate.env() })),
    b: clockDiv(c).by(lfo(0.1, 2, 6)).seq("c3").apply(s => s.cv.sin().gain({ level: s.gate.env({ release: 0.2 }) }))
  }).out()
)`,
};

export const clockDivShowcase: TestDefinition = {
	id: "clockdiv-showcase",
	category: "Timing",
	name: "clockDiv - showcase",
	desc: "Drum pattern with hi-hat, kick, snare",
	code: `clock(120).apply(c =>
  mix({
    a: c.seq("c4*4").trig.hihat(),
    b: clockDiv(c).by(4).seq("c4").trig.kick(),
    c: clockDiv(c).by(2).seq("~ c4").trig.snare()
  }).out()
)`,
};

export const clockDivTests = [clockDivDefault, clockDivAllParams, clockDivModBy, clockDivShowcase];
