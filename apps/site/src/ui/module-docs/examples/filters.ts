import type { DocExample } from "@/ui/docs-kit/doc-example";

export const FILTERS_EXAMPLES: readonly DocExample[] = [
	// ======================================================================
	// Filters — lpf/hpf/bpf/notch
	// ======================================================================
	{
		section: "Filters",
		title: "lpf — default",
		description:
			"A buzzy saw through a lowpass at the default cutoff 84 (≈1 kHz) — the top harmonics are gone, leaving a rounder tone.",
		code: `saw(45)
  .lpf()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "lpf — all params",
		description:
			"Cutoff 74 semis (≈590 Hz) with high resonance — a narrow, whistling peak sits right at the cutoff over the muffled saw.",
		code: `saw(45)
  .lpf({ cutoff: 74, res: 0.85 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "lpf — cutoff modulated",
		description:
			"A slow LFO drags the cutoff 55→102 semitones (200 Hz→3 kHz) — the classic filter sweep, dark to bright and back.",
		code: `saw(45)
  .lpf(lfo(0.2, 55, 102), 0.4)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "lpf — res modulated",
		description:
			"Fixed cutoff at 79 semis (≈780 Hz), but an LFO opens resonance 0→0.9 — the peak at the cutoff grows from flat to a sharp whistle.",
		code: `saw(45)
  .lpf(79, lfo(0.2, 0, 0.9))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "lpf — additive .mod (showcase)",
		description:
			"Cutoff base 60, plus a slow LFO ±12 semitones, plus an envelope adding up to 36 on each note — a wobbling filter that also blips open on every hit.",
		code: `tempo(120)
const s = seq("c2 c2 eb2 g1")
s.saw()
  .lpf({ cutoff: 60, res: 0.4 })
  .mod("cutoff", lfo(0.3), 12)
  .mod("cutoff", s.gate.ad(0.01, 0.3), 36)
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "hpf — default",
		description:
			"A saw through a highpass at the default cutoff 84 (≈1 kHz) — the body is scooped out, leaving a thin, fizzy top.",
		code: `saw(45)
  .hpf()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "hpf — all params",
		description:
			"Cutoff 74 semis (≈590 Hz) with high resonance — a thin, whistling peak sits right at the cutoff over the scooped saw.",
		code: `saw(45)
  .hpf({ cutoff: 74, res: 0.85 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "hpf — cutoff modulated",
		description:
			"An LFO sweeps the highpass cutoff 55→102 semitones (200 Hz→3 kHz) — the low end drains away as the sweep rises.",
		code: `saw(45)
  .hpf(lfo(0.2, 55, 102), 0.4)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "hpf — res modulated",
		description:
			"Fixed cutoff at 79 semis (≈780 Hz), but an LFO opens resonance 0→0.9 — the thin top grows a sharp whistling peak.",
		code: `saw(45)
  .hpf(79, lfo(0.2, 0, 0.9))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "bpf — default",
		description:
			"A bandpass at 1 kHz (83 semis) — only a slice of the saw around the cutoff survives, a nasal, telephone-like tone.",
		code: `saw(45)
  .bpf({ cutoff: 83, res: 0.6 })
  .gain(0.4)
  .out()`,
	},
	{
		section: "Filters",
		title: "bpf — cutoff modulated",
		description:
			"An LFO slides the bandpass 55→102 semitones (200 Hz→3 kHz) — a wah as the surviving slice of harmonics moves up and down.",
		code: `saw(45)
  .bpf(lfo(0.2, 55, 102), 0.7)
  .gain(0.4)
  .out()`,
	},
	{
		section: "Filters",
		title: "notch — default",
		description:
			"A notch at 1 kHz (83 semis) over noise — one narrow band is scooped out of the hiss, a subtle hollow in the wash.",
		code: `noise()
  .notch({ cutoff: 83, res: 0.7 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "notch — cutoff modulated (showcase)",
		description:
			"An LFO sweeps the notch 55→102 semitones (200 Hz→3 kHz) over noise — a phaser-like whoosh as the missing band travels up.",
		code: `noise()
  .notch(lfo(0.2, 55, 102), 0.8)
  .gain(0.3)
  .out()`,
	},

];
