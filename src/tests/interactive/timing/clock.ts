/**
 * clock - Clock pulse generator
 *
 * Inputs:
 *   bpm: number (default: 120) - tempo in beats per minute
 *   swing: number (default: 0) - swing amount 0-0.5
 *
 * Outputs:
 *   trig: trigger impulse on each beat
 *   gate: gate signal (high for half beat)
 */

import type { TestDefinition } from "../types";

export const clockDefault: TestDefinition = {
	id: "clock-default",
	category: "Timing",
	name: "clock - defaults",
	desc: "120 BPM clock driving a sequence",
	code: `clock().seq("c4 e4 g4 c5").apply(s =>
  s.cv.saw().gain({ level: s.gate.env() }).out()
)`,
};

export const clockAllParams: TestDefinition = {
	id: "clock-all-params",
	category: "Timing",
	name: "clock - all params",
	desc: "Slow tempo with swing",
	code: `clock({ bpm: 80, swing: 0.2 }).seq("c4 e4 g4 e4").apply(s =>
  s.cv.saw().gain({ level: s.gate.env() }).out()
)`,
};

export const clockModBpm: TestDefinition = {
	id: "clock-mod-bpm",
	category: "Timing",
	name: "clock - modulated bpm",
	desc: "Accelerating tempo",
	code: `clock({ bpm: lfo(0.1, 80, 160) }).seq("c4 e4").apply(s =>
  s.cv.saw().gain({ level: s.gate.env() }).out()
)`,
};

export const clockModSwing: TestDefinition = {
	id: "clock-mod-swing",
	category: "Timing",
	name: "clock - modulated swing",
	desc: "Varying swing amount",
	code: `clock({ bpm: 120, swing: lfo(0.1, 0, 0.3) }).seq("c4 e4 g4 e4").apply(s =>
  s.cv.saw().gain({ level: s.gate.env() }).out()
)`,
};

export const clockShowcase: TestDefinition = {
	id: "clock-showcase",
	category: "Timing",
	name: "clock - showcase",
	desc: "Funky swing groove",
	code: `clock({ bpm: 100, swing: 0.15 }).seq("c3 e3 g3 e3").apply(s =>
  s.cv.saw().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }) }).out()
)`,
};

export const clockTests = [clockDefault, clockAllParams, clockModBpm, clockModSwing, clockShowcase];
