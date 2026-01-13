/**
 * voices - Accessing individual voices from poly sources
 *
 * The .voices accessor extracts specific voices from a poly source,
 * enabling per-voice processing that differs from uniform poly chains.
 *
 * Primary use: splitting a chord into bass + upper voices with different treatment.
 */

import type { TestDefinition } from "../types";

export const voicesDefault: TestDefinition = {
	id: "voices-default",
	category: "Poly",
	name: "voices - defaults",
	desc: "Single voice extraction from chord",
	code: `let s = clock(120).seq("{c3,e3,g3}")
s.voices[0]
  .saw()
  .gain({ level: s.voices[0].gate.ar() })
  .out()`,
};

export const voicesTriggerSeq: TestDefinition = {
	id: "voices-trigger-seq",
	category: "Poly",
	name: "voices - trigger seq",
	desc: "Melody with root note triggering kick fill",
	code: `let s = clock(120).seq("{c3@4,[c4 e4 g4 e4]}")
s.saw()
  .lpf(800)
  .gain({ level: s.gate.ar() })
  .gain(0.3)
  .out()
seq("c4!4")
  .clk(s.voices[0].gate)
  .trig
  .kick()
  .gain(0.6)
  .out()`,
};

export const voicesPerVoiceFilter: TestDefinition = {
	id: "voices-per-voice-filter",
	category: "Poly",
	name: "voices - per-voice filtering",
	desc: "Each chord tone with progressively brighter filter",
	code: `let s = clock(60).seq("{c3,e3,g3}")
s.voices[0].saw().lpf(400).gain({ level: s.voices[0].gate.ar() }).out()
s.voices[1].saw().lpf(800).gain({ level: s.voices[1].gate.ar() }).out()
s.voices[2].saw().lpf(1600).gain({ level: s.voices[2].gate.ar() }).out()`,
};

export const voicesShowcase: TestDefinition = {
	id: "voices-showcase",
	category: "Poly",
	name: "voices - showcase",
	desc: "Sub bass + pad + arp from single pattern",
	code: `let s = clock(100).seq("{c2,c3 g3,c4 e4 g4 b4}")
s.voices[0].apply(v =>
  v.sin()
    .gain({ level: v.gate.ar({ attack: 0.02, release: 0.4 }) })
    .gain(0.5)
    .out()
)
s.voices[1].apply(v =>
  v.tri()
    .lpf(600)
    .gain({ level: v.gate.adsr({ attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.5 }) })
    .gain(0.25)
    .out()
)
s.voices[2].apply(v =>
  v.saw()
    .lpf(sin(0.3, 800, 2000))
    .gain({ level: v.gate.ar({ attack: 0.01, release: 0.1 }) })
    .delay({ time: 0.125, feedback: 0.4, mix: 0.3 })
    .gain(0.2)
    .out()
)`,
};

export const voicesTests = [
	voicesDefault,
	voicesTriggerSeq,
	voicesPerVoiceFilter,
	voicesShowcase,
];
