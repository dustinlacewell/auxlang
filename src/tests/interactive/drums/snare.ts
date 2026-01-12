/**
 * snare - Snare drum synthesizer
 *
 * Inputs:
 *   trig: signal (default: 0) - trigger impulse
 *   pitch: number (default: 180) - body pitch in Hz
 *   tone: number (default: 0.4) - body vs noise balance 0-1
 *   decay: number (default: 0.15) - envelope decay time
 *   snappy: number (default: 0.7) - snare wire brightness 0-1
 *
 * Outputs:
 *   audio: synthesized snare drum
 */

import type { TestDefinition } from "../types";

export const snareDefault: TestDefinition = {
	id: "snare-default",
	category: "Drums",
	name: "snare - defaults",
	desc: "Basic snare on beats 2 and 4",
	code: `clock(120).seq("~ c4 ~ c4").trig.snare().out()`,
};

export const snareAllParams: TestDefinition = {
	id: "snare-all-params",
	category: "Drums",
	name: "snare - all params",
	desc: "Snappy snare with high pitch and bright wires",
	code: `clock(120).seq("~ c4 ~ c4").trig.snare({ pitch: 200, tone: 0.3, decay: 0.12, snappy: 0.9 }).out()`,
};

export const snareModPitch: TestDefinition = {
	id: "snare-mod-pitch",
	category: "Drums",
	name: "snare - modulated pitch",
	desc: "Snare with varying body pitch",
	code: `clock(120).seq("~ c4 ~ c4").apply(s =>
  s.trig.snare({ pitch: lfo(0.25, 150, 220) }).out()
)`,
};

export const snareModTone: TestDefinition = {
	id: "snare-mod-tone",
	category: "Drums",
	name: "snare - modulated tone",
	desc: "Snare body/noise balance sweep",
	code: `clock(120).seq("~ c4 ~ c4").apply(s =>
  s.trig.snare({ tone: lfo(0.5, 0.1, 0.7) }).out()
)`,
};

export const snareModDecay: TestDefinition = {
	id: "snare-mod-decay",
	category: "Drums",
	name: "snare - modulated decay",
	desc: "Snare with varying decay",
	code: `clock(120).seq("~ c4 ~ c4").apply(s =>
  s.trig.snare({ decay: lfo(0.25, 0.08, 0.25) }).out()
)`,
};

export const snareModSnappy: TestDefinition = {
	id: "snare-mod-snappy",
	category: "Drums",
	name: "snare - modulated snappy",
	desc: "Snare wire brightness sweep",
	code: `clock(120).seq("~ c4 ~ c4").apply(s =>
  s.trig.snare({ snappy: lfo(0.5, 0.3, 0.95) }).out()
)`,
};

export const snareShowcase: TestDefinition = {
	id: "snare-showcase",
	category: "Drums",
	name: "snare - showcase",
	desc: "Backbeat snare pattern",
	code: `clock(120).seq("~ c4 ~ c4").trig.snare({ pitch: 180, tone: 0.4, decay: 0.15, snappy: 0.7 }).out()`,
};

export const snareTests = [snareDefault, snareAllParams, snareModPitch, snareModTone, snareModDecay, snareModSnappy, snareShowcase];
