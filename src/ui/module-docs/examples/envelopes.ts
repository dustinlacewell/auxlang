import type { DocExample } from "@/ui/docs-kit/doc-example";

export const ENVELOPES_EXAMPLES: readonly DocExample[] = [
	// ======================================================================
	// Envelopes — ad/ar/adsr
	// ======================================================================
	{
		section: "Envelopes",
		title: "ad — default",
		description:
			"A tone pinged by an attack-decay envelope on every clock beat — a short pluck, silent between hits.",
		code: `const c = tempo(120)
tri(57)
  .mul(c.beat.ad())
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ad — all params",
		description:
			"Slow 50 ms attack, long 400 ms decay — each beat swells in and rings out, more bell than pluck.",
		code: `const c = tempo(120)
tri(57)
  .mul(c.beat.ad(0.05, 0.4))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ad — decay modulated",
		description:
			"An LFO stretches the decay 0.05→0.6 s over time — plucks that grow longer and shorter as it breathes.",
		code: `const c = tempo(120)
tri(57)
  .mul(c.beat.ad(0.005, lfo(0.2, 0.05, 0.6)))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ar — default",
		description:
			"An attack-release envelope tracks a tempo-locked gate — the tone holds while the gate is high, then releases.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.ar())
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ar — all params",
		description:
			"Soft 80 ms attack, long 300 ms release — each gated note fades in and trails off, a pad-like swell.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.ar(0.08, 0.3))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ar — release modulated",
		description:
			"An LFO drags the release 0.05→0.6 s — the tail on each note grows and shrinks as the sweep moves.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.ar(0.01, lfo(0.2, 0.05, 0.6)))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — default",
		description:
			"The full envelope on each pulse of a square gate — attack, decay to a held sustain, then release. A rounded organ-ish note.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.adsr())
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — all params",
		description:
			"Every stage set: snappy attack, quick decay to a low 0.3 sustain, long release — a plucky note with a tail.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.adsr(0.01, 0.12, 0.3, 0.35))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — sustain modulated",
		description:
			"An LFO moves the sustain level 0.1→0.9 — the held middle of each note rises and falls between beats.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.adsr(0.01, 0.1, lfo(0.2, 0.1, 0.9), 0.2))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — attack modulated",
		description:
			"An LFO stretches the attack 0.002→0.3 s — notes shift from sharp plucks to slow swells and back.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.adsr(lfo(0.2, 0.002, 0.3), 0.1, 0.5, 0.2))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — showcase",
		description:
			"A sequenced bass, each note shaped by a plucky ADSR and rounded by a lowpass — a bouncing, musical line.",
		code: `tempo(120)
const s = seq("c2 g2 c3 eb2 g2 c3 f2 g2")
s.tri()
  .lpf(86, 0.3)
  .mul(s.gate.adsr(0.005, 0.1, 0.4, 0.12))
  .gain(0.35)
  .out()`,
	},
];
