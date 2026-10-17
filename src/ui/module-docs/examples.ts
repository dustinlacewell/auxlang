/**
 * The whole content of the module-docs page, as DATA. Every entry is a real
 * core3 patch string that compiles through the eval path and renders 2 s
 * non-silent, bounded, finite — the scratch script and the vitest test both
 * hold this file to that bar so the docs can never rot.
 *
 * Format law (see .claude/rules/interactive-examples.md): each AUDIBLE module
 * gets default / all-params / one-per-modulated-param / showcase. Pure-math
 * utils get abbreviated treatment (default + one modulated + a showcase only
 * where it is audibly meaningful). Descriptions say what the listener should
 * EXPECT to hear (aux-style voice, terse). Prefer sin/tri; modulate with slow
 * sin LFOs (0.2 over time, 0.5 to ping-pong two values).
 */

import type { DocExample } from "@/ui/docs-kit/doc-example";

export const EXAMPLES: readonly DocExample[] = [
	// ======================================================================
	// Sources — sin/saw/tri/sqr, lfo, noise, fm
	// ======================================================================
	{
		section: "Sources",
		title: "sin — default",
		description:
			"A bare sine at its default pitch (A4, 440 Hz): one pure, steady tone, no harmonics.",
		code: `sin()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "sin — all params",
		description:
			"Every port set: pitch 57 (220 Hz), fm silent, and the output squeezed into [-0.5, 0.5] — a quiet low sine.",
		code: `sin({ pitch: 57, fm: 0, min: -0.5, max: 0.5, phase: 0 })
  .out()`,
	},
	{
		section: "Sources",
		title: "sin — fm modulated",
		description:
			"220 Hz with an LFO adding −100 to +100 Hz straight onto the frequency — a gentle siren wandering up and down.",
		code: `sin({ pitch: 57, fm: lfo(0.2, -100, 100) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "sin — pitch modulated",
		description:
			"Driven by pitch (semitones) instead of freq: an LFO walks pitch 48→72, a smooth four-octave glide.",
		code: `sin()
  .pitch(lfo(0.2, 48, 72))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "sin — showcase",
		description:
			"Two sines half a hertz apart, each sent to the output (roots auto-mix) — slow phasing beats as they drift in and out of tune.",
		code: `sin(57).gain(0.2).out()
sin(hz(220.5)).gain(0.2).out()`,
	},
	{
		section: "Sources",
		title: "tri — default",
		description:
			"A triangle at A4 — softer than a saw, a few odd harmonics rolling off fast. Hollow, flute-ish.",
		code: `tri()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "tri — all params",
		description: "All ports: a 220 Hz triangle mapped to [-0.5, 0.5] — a mellow low drone.",
		code: `tri({ pitch: 57, fm: 0, min: -0.5, max: 0.5, phase: 0 })
  .out()`,
	},
	{
		section: "Sources",
		title: "tri — fm modulated",
		description:
			"220 Hz with an LFO adding −100 to +100 Hz straight onto the frequency — the same hollow tone, slowly climbing and falling.",
		code: `tri({ pitch: 57, fm: lfo(0.2, -100, 100) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "saw — default",
		description:
			"A band-limited saw at A4: bright, buzzy, every harmonic present. The classic subtractive-synth raw material.",
		code: `saw()
  .gain(0.25)
  .out()`,
	},
	{
		section: "Sources",
		title: "saw — fm modulated",
		description:
			"220 Hz with an LFO adding −100 to +100 Hz straight onto the frequency — a rising buzz, brightest at the top of the sweep.",
		code: `saw({ pitch: 57, fm: lfo(0.2, -100, 100) })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Sources",
		title: "sqr — default",
		description: "A band-limited square at A4: only odd harmonics — a hollow, clarinet-like buzz.",
		code: `sqr()
  .gain(0.22)
  .out()`,
	},
	{
		section: "Sources",
		title: "sqr — fm modulated",
		description:
			"220 Hz with an LFO adding −100 to +100 Hz straight onto the frequency — the hollow tone slowly climbing.",
		code: `sqr({ pitch: 57, fm: lfo(0.2, -100, 100) })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Sources",
		title: "lfo — default",
		description:
			"The Hz-rate modulation source: a 2 Hz sine in [0, 0.4] wobbles the gain of a steady tone.",
		code: `sin(hz(330))
  .gain(lfo(2, 0, 0.4))
  .out()`,
	},
	{
		section: "Sources",
		title: "lfo — shape config",
		description:
			"shape picks the waveform (sin default, saw/tri/sqr): a square LFO chops the gain on/off.",
		code: `sin(hz(330))
  .gain(lfo({ freq: 2, min: 0, max: 0.4, shape: "sqr" }))
  .out()`,
	},
	{
		section: "Sources",
		title: "noise — default",
		description:
			"White noise, uniform in [-1, 1] — a steady wash of hiss, every frequency at once.",
		code: `noise()
  .gain(0.2)
  .out()`,
	},
	{
		section: "Sources",
		title: "noise — range set",
		description: "min/max are noise's only ports — amplitude set at the source, no gain needed.",
		code: `noise({ min: -0.3, max: 0.3 })
  .out()`,
	},
	{
		section: "Sources",
		title: "noise — filtered showcase",
		description:
			"White noise swept by a resonant lowpass whose cutoff a slow LFO drags 62→107 semitones (300 Hz→4 kHz) — wind rising into a whistle.",
		code: `noise()
  .lpf(lfo(0.2, 62, 107), 0.6)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — default",
		description:
			"Two-op FM at A4, ratio 1, moderate index — a clean sine mildly enriched with sidebands.",
		code: `fm()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — all params",
		description:
			"220 Hz carrier, ratio 2 (harmonic), high index — a bright, clangy bell tone.",
		code: `fm({ pitch: 57, index: 6, ratio: 2 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — index modulated",
		description:
			"An LFO sweeps index 0→8 — the tone grows from a clean sine into a bright bell and back.",
		code: `fm({ pitch: 57, index: lfo(0.2, 0, 8) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — ratio modulated",
		description:
			"An LFO sweeps ratio 1→3 — the timbre drifts from harmonic to clangy and back.",
		code: `fm({ pitch: 57, index: 4, ratio: lfo(0.2, 1, 3) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — showcase",
		description:
			"A plucky FM bell sequence, index driven by each note's envelope so the brightness snaps down with the pluck.",
		code: `tempo(90)
const s = seq("c4 e4 g4 c5")
s.fm({ index: s.gate.ad(0.005, 0.3).mul(5), ratio: 1.5 })
  .gain(s.gate.ad(0.005, 0.3))
  .out()`,
	},
	{
		section: "Sources",
		title: "slider — default",
		description:
			"A slider the editor sets while the patch plays, starting at 0.5 in [0, 1] — a steady gain until you drag it.",
		code: `sin(60)
  .gain(slider(0.5, 0, 1))
  .out()`,
	},
	{
		section: "Sources",
		title: "slider — all params",
		description:
			"Range narrowed to [50, 110] and a slower 0.3 s ramp — the same slider, a coarser filter sweep that glides instead of jumping.",
		code: `saw(45)
  .lpf(slider(80, 50, 110, { slew: secs(0.3) }))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "slider — slew modulated",
		description:
			"An LFO sweeps the ramp time itself, 0→0.3 s — the same step write glides at a different speed each cycle.",
		code: `sin(60)
  .gain(slider(0.4, 0, 1, { slew: lfo(0.2, 0, 0.3) }))
  .out()`,
	},
	{
		section: "Sources",
		title: "knob — default",
		description:
			"A knob the editor sets while the patch plays, starting at 0.5 in [0, 1] — identical to slider, a different widget.",
		code: `sin(60)
  .gain(knob(0.5, 0, 1))
  .out()`,
	},
	{
		section: "Sources",
		title: "knob — all params",
		description: "Range [0.1, 0.4] — the knob sweeps a narrower slice of gain.",
		code: `sin(60)
  .gain(knob(0.3, 0.1, 0.4))
  .out()`,
	},
	{
		section: "Sources",
		title: "xy — default",
		description:
			"An x/y pad the editor sets while the patch plays — x drives one voice's gain, y another's, from a single control.",
		code: `const pad = xy(0.2, 0.4, 0, 1)
sin(60).gain(pad.x).out()
sin(67).gain(pad.y).out()`,
	},
	{
		section: "Sources",
		title: "xy — all params",
		description: "Range narrowed to [50, 110]: x and y each steer a filter cutoff over the same saw.",
		code: `saw(45)
  .lpf(xy(80, 90, 50, 110).x)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "toggle — default",
		description:
			"An on/off switch the editor sets while the patch plays — the gate starts high (1), so the tone sounds until you flip it.",
		code: `sin(60)
  .gain(toggle(1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "toggle — all params",
		description:
			"Two voices on two switches: one on, one off at start — only the first sounds until the editor flips the other.",
		code: `sin(60).gain(toggle(1)).gain(0.2).out()
tri(72).gain(toggle(0)).gain(0.2).out()`,
	},
	{
		section: "Sources",
		title: "button — default",
		description:
			"A button the editor presses while the patch plays: a gate while held — pressed, it gates a tone straight through at full level.",
		code: `sin(60)
  .mul(button({ pressed: 1 }))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "button — showcase",
		description:
			"The one-sample press trigger fires a fresh decay envelope every time the editor clicks it — a percussive blip on each press.",
		code: `const b = button({ pressed: 1 })
sin(72)
  .mul(ad({ gate: b.trig, attack: 0.003, decay: 0.4 }))
  .gain(0.3)
  .out()`,
	},

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

	// ======================================================================
	// Effects — delay, tape, reverb, pan, spread, phaser, shape
	// ======================================================================
	{
		section: "Effects",
		title: "delay — default",
		description:
			"A plucked tone through the default 0.25 s delay — one clear echo trailing each note at 50% wet.",
		code: `const c = tempo(90)
sin(69)
  .mul(c.beat.ad(0.005, 0.1))
  .delay()
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — all params",
		description:
			"Short 150 ms time, high 0.6 feedback, 0.4 mix, tone 0.5 — plucks smear into a repeating trail that dulls as it decays.",
		code: `const c = tempo(90)
sin(69)
  .mul(c.beat.ad(0.005, 0.08))
  .delay({ time: 0.15, feedback: 0.6, mix: 0.4, tone: 0.5 })
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — time modulated",
		description:
			"An LFO slides the delay time 0.05→0.4 s — the echo spacing stretches and squeezes, a tape-warble pitch bend.",
		code: `const c = tempo(90)
tri(hz(330))
  .mul(c.beat.ad(0.005, 0.1))
  .delay(lfo(0.2, 0.05, 0.4), 0.5, 0.4)
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — feedback modulated",
		description:
			"An LFO opens feedback 0.1→0.85 — the echo tail lengthens from a single slap to a long repeating wash.",
		code: `const c = tempo(90)
tri(hz(330))
  .mul(c.beat.ad(0.005, 0.1))
  .delay(0.2, lfo(0.2, 0.1, 0.85), 0.4)
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — mix modulated",
		description:
			"An LFO crossfades mix 0→0.8 — the effect fades between dry plucks and drowning echoes.",
		code: `const c = tempo(90)
tri(hz(330))
  .mul(c.beat.ad(0.005, 0.1))
  .delay(0.18, 0.5, lfo(0.2, 0, 0.8))
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — tone modulated",
		description:
			"An LFO sweeps tone 0.1→0.9 — the repeats go dark and muffled, then bright again. The first echo stays clear; each pass through the loop darkens the next.",
		code: `const c = tempo(90)
saw(57)
  .mul(c.beat.ad(0.005, 0.1))
  .delay({ time: 0.2, feedback: 0.7, mix: 0.5, tone: lfo(0.2, 0.1, 0.9) })
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — default",
		description:
			"A plucked tone through the default tape echo — a warm repeat 0.3 s behind each note, slightly darker each time, with a faint pitch wobble.",
		code: `const c = tempo(90)
tri(69)
  .mul(c.beat.ad(0.005, 0.1))
  .tape()
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — all params",
		description:
			"Worn, driven tape: 0.35 s repeats that thicken, dull and drift in pitch as they decay.",
		code: `const c = tempo(90)
tri(69)
  .mul(c.beat.ad(0.005, 0.1))
  .tape({
    time: 0.35,
    feedback: 0.55,
    mix: 0.5,
    drive: 0.6,
    wow: 0.5,
    flutter: 0.4,
    tone: 0.4})
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — time modulated",
		description:
			"An LFO moves the playhead 0.1→0.4 s — the repeats bend down and up in pitch as the head slides.",
		code: `const c = tempo(90)
tri(64)
  .mul(c.beat.ad(0.005, 0.1))
  .tape({ time: lfo(0.2, 0.1, 0.4), feedback: 0.5 })
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — feedback modulated",
		description:
			"An LFO opens feedback 0.1→0.9 — one slap, then a long trail of repeats that pile up and saturate.",
		code: `const c = tempo(90)
tri(64)
  .mul(c.beat.ad(0.005, 0.1))
  .tape({ time: 0.25, feedback: lfo(0.2, 0.1, 0.9) })
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — mix modulated",
		description: "An LFO crossfades mix 0→0.8 — dry plucks fade into a wash of tape repeats.",
		code: `const c = tempo(90)
tri(64)
  .mul(c.beat.ad(0.005, 0.1))
  .tape({ feedback: 0.5, mix: lfo(0.2, 0, 0.8) })
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — drive modulated",
		description:
			"An LFO sweeps drive 0→1 — the loud repeats go from clean to rounded, compressed and thick.",
		code: `const c = tempo(90)
saw(45)
  .lpf(hz(900))
  .mul(c.beat.ad(0.01, 0.2))
  .tape({ drive: lfo(0.2, 0, 1), feedback: 0.6, mix: 0.6 })
  .gain(0.8)
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — wow modulated",
		description:
			"An LFO raises wow 0→1 — the repeats go from steady to a slow, seasick pitch drift.",
		code: `const c = tempo(90)
tri(69)
  .mul(c.beat.ad(0.005, 0.15))
  .tape({ wow: lfo(0.2, 0, 1), flutter: 0, feedback: 0.6, mix: 0.6 })
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — flutter modulated",
		description:
			"An LFO raises flutter 0→1 — a fast, uneven warble creeps into the repeats, then fades out.",
		code: `const c = tempo(90)
tri(72)
  .mul(c.beat.ad(0.005, 0.15))
  .tape({ wow: 0, flutter: lfo(0.2, 0, 1), feedback: 0.6, mix: 0.6 })
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — tone modulated",
		description:
			"An LFO sweeps tone 0.1→1 — the repeats turn dark and muffled, then bright again.",
		code: `const c = tempo(90)
saw(57)
  .mul(c.beat.ad(0.005, 0.1))
  .tape({ tone: lfo(0.2, 0.1, 1), feedback: 0.65 })
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "tape — dub echo (showcase)",
		description:
			"A sparse minor riff into a driven, dark, wobbly tape echo — dotted-eighth repeats that sag in pitch and melt into a warm tail.",
		code: `const c = tempo(80)
const s = seq("c4 ~ ~ eb4 ~ ~ g4 ~ ~ ~ bb3 ~ ~ ~ ~ ~")
s.tri()
  .lpf(hz(2200))
  .mul(s.gate.ad(0.005, 0.18))
  .tape({
    time: beats(3/4),
    feedback: 0.65,
    mix: 0.5,
    drive: 0.5,
    wow: 0.35,
    flutter: 0.3,
    tone: 0.45})
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — default",
		description:
			"A plucked tone into the default reverb (room 0.5, mix 0.33) — a short, natural room tail behind each note.",
		code: `const c = tempo(70)
sin(69)
  .mul(c.beat.ad(0.005, 0.08))
  .reverb()
  .gain(0.7)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — all params",
		description:
			"Every port: a big 0.9 room, dark 0.7 damp, fully wet — the pluck dissolves into a long, dim cathedral wash.",
		code: `const c = tempo(70)
sin(69)
  .mul(c.beat.ad(0.005, 0.08))
  .reverb({ room: 0.9, damp: 0.7, mix: 1 })
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — room modulated",
		description:
			"An LFO sweeps room 0.2→0.95 — the tail grows from a tight closet slap to a huge decaying hall.",
		code: `const c = tempo(70)
sin(69)
  .mul(c.beat.ad(0.005, 0.08))
  .reverb(lfo(0.15, 0.2, 0.95), 0.5, 0.7)
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — damp modulated",
		description:
			"An LFO opens damp 0→0.9 — the tail's top end darkens and brightens, from a bright glassy ring to a muffled thud.",
		code: `const c = tempo(70)
sin(69)
  .mul(c.beat.ad(0.005, 0.08))
  .reverb(0.8, lfo(0.15, 0, 0.9), 0.7)
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — mix modulated (showcase)",
		description:
			"An LFO crossfades mix 0→1 over a sparse pattern — plucks swing between bone-dry and fully drowned in tail.",
		code: `const c = tempo(70)
sin(69)
  .mul(c.beat.ad(0.005, 0.08))
  .reverb(0.85, 0.4, lfo(0.1, 0, 1))
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "pan — default",
		description:
			"A tone with pan at center (pos 0) — equal in both ears. Both jacks are patched to the master's l/r so the placement survives.",
		code: `sin(hz(330))
  .gain(0.3)
  .pan()
  .apply(p => out({ l: p.l, r: p.r }))`,
	},
	{
		section: "Effects",
		title: "pan — pos modulated (showcase)",
		description:
			"A slow LFO drives pan pos -1→1 — the tone drifts hard from the left ear to the right and back; L and R trade fully.",
		code: `sin(hz(330))
  .gain(0.3)
  .pan(lfo(0.3, -1, 1))
  .apply(p => out({ l: p.l, r: p.r }))`,
	},
	{
		section: "Effects",
		title: "spread — default",
		description:
			"A three-note chord spread wide: C hard left, E in the center, G hard right. spread places each lane evenly across the field.",
		code: `tempo(60)
const s = seq("[c4,e4,g4]")
s.tri()
  .mul(s.gate.ad(0.01, 0.6))
  .gain(0.4)
  .spread()
  .out()`,
	},
	{
		section: "Effects",
		title: "spread — all params",
		description: "amount 0.3: the same chord pulled in close to the center, a narrow stereo image.",
		code: `tempo(60)
const s = seq("[c4,e4,g4]")
s.tri()
  .mul(s.gate.ad(0.01, 0.6))
  .gain(0.4)
  .spread(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "spread — amount modulated",
		description:
			"An LFO sweeps amount 0→1 — a held chord opens from mono to full width and folds back.",
		code: `tempo(60)
const s = seq("[c3,g3,e4,b4]")
s.tri()
  .mul(s.gate.adsr(0.05, 0.2, 0.8, 0.3))
  .gain(0.4)
  .spread(lfo(0.2, 0, 1))
  .out()`,
	},
	{
		section: "Effects",
		title: "spread — detuned saws (showcase)",
		description:
			"Three saws per note, 12 cents apart: a pattern stack added to the pitch makes three lanes, and spread fans them left, center, right — a wide supersaw.",
		code: `tempo(90)
const s = seq("c3 g2 a2 f2")
s.add(p\`[-0.12, 0, 0.12]\`)
  .saw()
  .lpf(84, 0.2)
  .mul(s.gate.adsr(0.01, 0.2, 0.6, 0.3))
  .gain(0.3)
  .spread()
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — default",
		description:
			"A saw through the default phaser — a gentle sweeping shimmer as the moving notches pass through the harmonics.",
		code: `saw(45)
  .phaser()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — all params",
		description:
			"Fast rate, deep sweep, high feedback, fully wet — a swirling, resonant sweep.",
		code: `saw(45)
  .phaser({ rate: 1.2, depth: 0.9, feedback: 0.6, mix: 0.8 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — rate modulated",
		description:
			"An LFO sweeps the phaser rate 0.1→2 Hz — the sweep itself speeds up and slows down.",
		code: `saw(45)
  .phaser(lfo(0.2, 0.1, 2), 0.7, 0.5)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — depth modulated",
		description:
			"An LFO opens depth 0.1→1 — the notches travel a wider range as it swells.",
		code: `saw(45)
  .phaser(0.5, lfo(0.2, 0.1, 1), 0.5)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — feedback modulated",
		description:
			"An LFO opens feedback 0.1→0.85 — the notches sharpen into a resonant peak.",
		code: `saw(45)
  .phaser({ feedback: lfo(0.2, 0.1, 0.85) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — mix modulated (showcase)",
		description:
			"An LFO crossfades mix 0→1 — swings between the dry saw and the full phaser wash.",
		code: `saw(45)
  .phaser(0.5, 0.7, lfo(0.2, 0, 1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "shape — default",
		description: "A sine through the default waveshaper — mild tanh warmth.",
		code: `sin(57)
  .shape()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "shape — all params",
		description: "Amount at 0.9 — heavy tanh saturation, a fuzzy, crunchy sine.",
		code: `sin(57)
  .shape({ amount: 0.9 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "shape — amount modulated (showcase)",
		description:
			"An LFO sweeps amount 0→1 — the clean sine grows into heavy fuzz and back.",
		code: `sin(57)
  .shape(lfo(0.2, 0, 1))
  .gain(0.3)
  .out()`,
	},

	// ======================================================================
	// Utils — gain/mul/vca, slew, sah, scale, quantize, mix, z1, out
	// ======================================================================
	{
		section: "Utils",
		title: "gain — a level",
		description: "gain multiplies by a level: 0.25 is the same tone at a quarter amplitude.",
		code: `sin(hz(330))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Utils",
		title: "gain — level modulated",
		description: "An LFO on the level, 0→0.5 — tremolo. A moving gain is all tremolo is.",
		code: `sin(hz(330))
  .gain(lfo(0.5, 0, 0.5))
  .out()`,
	},
	{
		section: "Utils",
		title: "mul — as ring-mod (showcase)",
		description:
			"Two audio-rate sines multiplied — ring modulation. Neither input pitch survives; you hear their sum and difference.",
		code: `sin(hz(330))
  .mul(sin(hz(140)))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "mul — tremolo into sidebands (showcase)",
		description:
			"Tremolo accelerated into the audio band: past ~20 Hz the wobble fuses into sideband tones — modulation becomes timbre.",
		code: `sin(hz(330))
  .mul(lfo(lfo(0.1, 2, 250), 0, 1))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "vca — the canonical patch",
		description:
			"Same module as mul and gain, named for the patch: audio in, envelope on the other input. Every note in these docs is this.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
sin(hz(330))
  .vca(g.gate.adsr(0.01, 0.1, 0.6, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "vca — sidechain duck (showcase)",
		description:
			"The kick's envelope inverted (1 − env) drives the saw's vca — it ducks on every hit. The pump.",
		code: `const c = tempo(120)
c.beat.kick().gain(0.7).out()
saw(57)
  .lpf(89, 0.2)
  .gain(0.25)
  .vca(c.beat.ad(0.005, 0.3).sub(1))
  .out()`,
	},
	{
		section: "Utils",
		title: "slew — default",
		description:
			"A stepped LFO (sample-and-held) fed through slew — the jumps are rounded into glides. Portamento on pitch.",
		code: `const c = tempo(240)
sin()
  .pitch(lfo(0.4, 40, 70).sah(c.beat).slew(0.08, 0.08))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "slew — rate modulated",
		description:
			"The same stepped pitch, but an LFO stretches the glide time 0.01→0.3 s — slides from instant jumps to lazy swoops.",
		code: `const c = tempo(240)
const g = lfo(0.2, 0.01, 0.3)
sin()
  .pitch(lfo(0.4, 40, 70).sah(c.beat).slew(g, g))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "sah — default",
		description:
			"White noise sampled and held on each clock trig — a staircase of random pitches, a classic random-note generator.",
		code: `const c = tempo(300)
sin()
  .pitch(noise().scale({ min: 40, max: 76 }).sah(c.beat))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "sah — showcase (random arp)",
		description:
			"Sampled noise quantized to a pentatonic scale on every trig — a tuneful random melody instead of atonal jumps.",
		code: `const c = tempo(360)
const notes = noise().scale({ min: 48, max: 84 }).sah(c.beat)
sin()
  .pitch(notes.quantize({ scaleName: "minor pentatonic", root: 0, octave: 4, range: 3 }))
  .mul(c.beat.ad(0.005, 0.12))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "scale — default",
		description:
			"scale maps a bipolar LFO [-1,1] onto [0,1]: here it drives gain, a smooth tremolo from a raw LFO.",
		code: `sin(hz(330))
  .gain(lfo(0.5).scale({ min: 0, max: 0.5 }))
  .out()`,
	},
	{
		section: "Utils",
		title: "scale — showcase (LFO to cutoff)",
		description:
			"A bipolar sine LFO scaled to [62, 102] semitones (300 Hz→3 kHz) drives a filter cutoff — the idiom for remapping any modulator's range.",
		code: `saw(45)
  .lpf(lfo(0.2).scale({ min: 62, max: 102 }), 0.4)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — default",
		description:
			"A clocked random-note generator: noise sampled on every beat, snapped to the major scale — a bright, always-in-key arp.",
		code: `const c = tempo(140)
sin()
  .pitch(noise().scale({ min: 48, max: 84 }).sah(c.beat).quantize())
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — all params",
		description:
			"Every port set: snapped to A minor pentatonic, root 9 (A), window two octaves starting at octave 3 — a tight, rootsy random riff.",
		code: `const c = tempo(140)
sin()
  .pitch(noise().scale({ min: 36, max: 84 }).sah(c.beat).quantize({ scaleName: "minor pentatonic", root: 9, octave: 3, range: 2 }))
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — root modulated (key change)",
		description:
			"Same random arp, but the root steps up a fourth on beat 3 of every bar — the whole riff modulates to a new key without ever leaving it.",
		code: `const c = tempo(140)
const key = p\`0 0 5 5\`.steps()
sin()
  .pitch(noise().scale({ min: 48, max: 84 }).sah(c.beat).quantize({ scaleName: "dorian", root: key }))
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — range modulated (riser)",
		description:
			"The playable window opens from one octave to four over eight bars — the same random arp starts tight and spreads wide, a classic buildup.",
		code: `const c = tempo(140)
sin()
  .pitch(noise().scale({ min: 24, max: 96 }).sah(c.beat).quantize({ scaleName: "major pentatonic", range: lfo(0.02, 1, 4) }))
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — showcase (generative bassline)",
		description:
			"A clocked random bassline over a blues scale, played through a filtered saw with a short decay — the idiom for a generative bass part that never leaves the key.",
		code: `const c = tempo(100)
const note = noise().scale({ min: 28, max: 52 }).sah(c.beat).quantize({ scaleName: "minor blues", root: 7, octave: 2, range: 2 })
note.saw()
  .lpf({ cutoff: note.add(24), res: 0.3 })
  .mul(c.beat.ad(0.002, 0.2))
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — default",
		description:
			"A small waveform appears right after the call: a steady sine, held still by the scope's trigger. The signal passes through to the speakers unchanged.",
		code: `sin()
  .scope()
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — all params",
		description:
			"A 50 ms sweep in a bigger widget, on a fixed -1..1 scale instead of the default fit.",
		code: `tri(57)
  .scope({ time: 0.05, width: 200, height: 60, min: -1, max: 1 })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — time modulated",
		description: "The sweep length swings from 5 ms to 50 ms: the picture zooms in and out of the wave.",
		code: `tri()
  .scope({ time: lfo(0.2, 0.005, 0.05) })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — showcase (probing a voice)",
		description:
			"One scope taps the oscillator mid-chain; a second, with no output of its own, draws the envelope and an LFO as two colored traces.",
		code: `tempo(120)
const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .scope()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()
scope({ env: s.gate.adsr(0.01, 0.1, 0.5, 0.2), lfo: lfo(0.5) })`,
	},
	{
		section: "Utils",
		title: "mix — poly lanes to mono",
		description:
			"A chord [c,e,g] is three poly lanes; mix sums them to one lane with 1/√3 scaling — the chord, folded down without clipping.",
		code: `tempo(90)
const s = seq("[c3,e3,g3]")
s.tri()
  .mix()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "mix — showcase (chord to filter)",
		description:
			"A five-note stack mixed to mono, then a resonant lowpass sweep — mix is the summing point that lets one filter shape a whole chord.",
		code: `tempo(80)
const s = seq("[c3,e3,g3,b3,d4]")
s.tri()
  .mix()
  .lpf(lfo(0.2, 67, 102), 0.5)
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "z1 — average with the last sample",
		description:
			"Each sample plus the previous — the highs cancel and the hiss dulls. The one-sample average is the smallest lowpass.",
		code: `const n = noise().gain(0.3)
n.add(n.z1())
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "z1 — difference from the last sample",
		description:
			"Each sample minus the previous — only change survives; the hiss thins and brightens. The unit delay is the atom digital filters are built from.",
		code: `const n = noise().gain(0.3)
n.z1().sub(n)
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "period — tuned delay (showcase)",
		description:
			"A short noise burst excites a delay tuned to C3 (period(48)) with heavy feedback — Karplus-Strong: the loop rings at the pitch instead of echoing as separate repeats.",
		code: `const c = tempo(100)
noise()
  .mul(c.beat.ad(0.001, 0.02))
  .delay({ time: period(48), feedback: 0.95, mix: 1 })
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "period — pitch modulated",
		description:
			"The same plucked string, but an LFO walks the tuning 48→60 semitones (C3→C4) — the ringing pitch glides up and down between hits.",
		code: `const c = tempo(100)
noise()
  .mul(c.beat.ad(0.001, 0.02))
  .delay({ time: period(lfo(0.2, 48, 60)), feedback: 0.95, mix: 1 })
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "out — the only thing that sounds",
		description:
			"Nothing plays until it reaches out; chains that never arrive are pruned. A mono input auto-centers.",
		code: `sin(hz(330))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "out — poly spread (showcase)",
		description:
			"out places every in lane dead center; spread() fans the poly lanes across the stereo field at constant power before they reach it — a four-voice chord gets width.",
		code: `tempo(90)
const s = seq("[c2,g2,e3,b3]")
s.tri()
  .mul(s.gate.adsr(0.02, 0.1, 0.6, 0.2))
  .gain(0.5)
  .spread()
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — default",
		description:
			"Two named channels summed at their default level (1 each) — a sine and a triangle, equally loud.",
		code: `mixer({ a: sin({ pitch: hz(220) }), b: tri({ pitch: hz(222) }) })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — all params",
		description:
			".level sets each channel's own gain — here b is turned down to a quarter, so the triangle sits under the sine instead of beside it.",
		code: `mixer({ a: sin({ pitch: hz(220) }), b: tri({ pitch: hz(222) }) })
  .level({ a: 1, b: 0.25 })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — level modulated",
		description:
			'.mod("level.a", lfo, depth) rides one channel\'s level up and down — the sine fades in and out while the triangle holds steady underneath.',
		code: `mixer({ a: sin({ pitch: hz(220) }), b: tri({ pitch: hz(222) }) })
  .level({ a: 0.5, b: 0.3 })
  .mod("level.a", lfo(0.2, -0.4, 0.4), 1)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — showcase",
		description:
			"A drum bus and a bass bus summed into one mix, the bass turned down against the beat — the way a real mixer channel-strips a patch.",
		code: `const c = tempo(120)
const drums = c.beat.kick().gain(1)
const bass = seq("c1 c1 eb1 g0").tri().mul(seq("c1 c1 eb1 g0").gate.adsr(0.005, 0.1, 0.6, 0.15))
mixer({ drums, bass })
  .level({ bass: 0.5 })
  .gain(0.3)
  .out()`,
	},

	// ======================================================================
	// Math — add, sub, div, gt/lt/eq, clip, abs, mod
	// ======================================================================
	{
		section: "Math",
		title: "add — vibrato (showcase)",
		description:
			"A base pitch of 69 with a fast vibrato LFO added in semitones — add offsets any signal, here a wobble on a steady tone.",
		code: `sin()
  .pitch(lfo(6, -0.5, 0.5).add(69))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Math",
		title: "add — modulated",
		description:
			"A steady 300 Hz base with an LFO-driven offset added in Hz — the pitch drifts up and down around 300.",
		code: `sin({ pitch: hz(lfo(0.3, -80, 80).add(300)) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Math",
		title: "sub — pitch dip",
		description:
			"sub is from − in: pitch 72 minus an LFO 0→12 — the tone dips down an octave and comes back.",
		code: `sin()
  .pitch(lfo(0.2, 0, 12).sub(72))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Math",
		title: "sub — inverted gate (off-beats)",
		description: "1 − gate flips a gate: the note sounds where the square gate is low — the off-beats.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
tri(57)
  .mul(g.gate.sub(1).ar(0.01, 0.08))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "div — sub-octave (showcase)",
		description:
			"The classic sub-oscillator: the same swept frequency divided by 2 rides an octave below, locked in tune.",
		code: `const f = lfo(0.2, 220, 440)
saw(hz(f)).gain(0.12).out()
saw(hz(f.div(2))).gain(0.18).out()`,
	},
	{
		section: "Math",
		title: "div — modulated",
		description: "660 Hz divided by an LFO 1→3 — the pitch sinks toward a third and climbs back.",
		code: `sin({ pitch: hz(div({ in: 660, by: lfo(0.2, 1, 3) })) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Math",
		title: "gt — gate from LFO (showcase)",
		description:
			"A slow LFO through gt(0) becomes a square gate — the envelope opens for half of each cycle. Comparators make rhythms.",
		code: `sin(hz(330))
  .mul(lfo(1).gt(0).ar(0.02, 0.1))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "gt — threshold is pulse width",
		description:
			"An LFO moves the threshold itself: higher threshold, narrower gate — the notes stretch and shrink.",
		code: `sin(hz(330))
  .mul(lfo(1).gt(lfo(0.1, -0.7, 0.7)).ar(0.01, 0.05))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "lt — inverted gate",
		description:
			"lt(0) fires when the LFO is BELOW zero — the opposite half-cycle to gt, gating the down phase.",
		code: `tri(57)
  .mul(lfo(1).lt(0).ar(0.02, 0.15))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "lt — coin flip per beat (showcase)",
		description:
			"Sampled noise below zero opens the gate — a seeded coin flip per beat, a random rhythm that repeats every run.",
		code: `const c = tempo(240)
tri(hz(330))
  .mul(noise().sah(c.beat).lt(0).ar(0.01, 0.1))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "eq — select a step",
		description:
			"eq gates while two signals match: a step pattern against 2 — one pluck on that step, each cycle.",
		code: `tempo(120)
sin(hz(330))
  .mul(eq({ in: p\`0 1 2 3\`, than: 2 }).ad(0.005, 0.2))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Math",
		title: "eq — one row, three voices (showcase)",
		description:
			"A single number row demultiplexed by three comparators — each digit is an instrument. A whole kit from one pattern.",
		code: `tempo(120)
const row = p\`0 2 1 2 0 2 1 2\`
eq({ in: row, than: 0 }).kick().gain(0.7).out()
eq({ in: row, than: 1 }).snare().gain(0.5).out()
eq({ in: row, than: 2 }).hihat().gain(3.5).out()`,
	},
	{
		section: "Math",
		title: "clip — waveshaping (showcase)",
		description:
			"A loud sine clipped to [-0.3, 0.3] — the peaks are flattened into a near-square, adding buzzy harmonics. Distortion.",
		code: `sin(hz(150))
  .gain(3)
  .clip(-0.3, 0.3)
  .gain(0.4)
  .out()`,
	},
	{
		section: "Math",
		title: "clip — threshold modulated",
		description:
			"An LFO drives the symmetric clip threshold 0.1→0.9 — the distortion grinds harder as the ceiling drops, then cleans up.",
		code: `const t = lfo(0.2, 0.1, 0.9)
sin(hz(150))
  .gain(2)
  .clip(t.mul(-1), t)
  .gain(0.4)
  .out()`,
	},
	{
		section: "Math",
		title: "abs — full-wave rectify (showcase)",
		description:
			"abs folds a sine's negative half up — the period halves, so the tone jumps an octave and buzzes.",
		code: `sin(hz(150))
  .abs()
  .gain(0.4)
  .out()`,
	},
	{
		section: "Math",
		title: "abs — LFO swing to bounce",
		description:
			"The same fold on an LFO: a bipolar swing becomes unipolar humps at twice the rate — tremolo that bounces instead of sways.",
		code: `sin(hz(330))
  .gain(lfo(0.5).abs().mul(0.4))
  .out()`,
	},
	{
		section: "Math",
		title: "wrap — fold pitch into an octave (showcase)",
		description:
			"Pitch ramps across four octaves, wrapped modulo 12 — the line keeps rising but folds back every octave.",
		code: `sin()
  .pitch(lfo(0.2, 48, 96).wrap(12).add(48))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Math",
		title: "wrap — audio-rate wrap (distortion)",
		description:
			"A loud sine wrapped modulo — each overflow snaps back through zero, a harsher cousin of clip. The divisor sweeps from mangled to clean.",
		code: `sin(hz(150))
  .gain(2)
  .wrap(lfo(0.2, 0.4, 2.5))
  .gain(0.5)
  .out()`,
	},

	// ======================================================================
	// Timing — clock, seq, counter
	// ======================================================================
	{
		section: "Timing",
		title: "clock — default",
		description:
			"A clock at the default 120 bpm. Its beat output is a single-sample trig each beat — here it fires an AD envelope, a clean pluck twice a second.",
		code: `const c = clock()
sin(hz(330))
  .mul(c.beat.ad(0.005, 0.12))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Timing",
		title: "clock — all params",
		description:
			"90 bpm, three beats per bar — a high pluck on every beat and a low one on each downbeat (the bar trig). A waltz pulse.",
		code: `const c = clock({ bpm: 90, beatsPerBar: 3 })
sin(hz(660)).mul(c.beat.ad(0.005, 0.08)).gain(0.25).out()
tri(45).mul(c.bar.ad(0.005, 0.3)).gain(0.4).out()`,
	},
	{
		section: "Timing",
		title: "clock — bpm modulated (showcase)",
		description:
			"An LFO drags the tempo 60→240 bpm — the pluck pattern accelerates and slows, a rubato pulse.",
		code: `const c = clock(lfo(0.15, 60, 240))
tri(57)
  .mul(c.beat.ad(0.005, 0.1))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Timing",
		title: "clock — a second tempo",
		description:
			"A clock's default output is its position in bars. Hand it to seq and that seq runs at its own tempo — four notes a bar at 120 against three a bar at 90.",
		code: `tempo(120)
const a = seq("c3 e3 g3 e3")
a.tri().mul(a.gate.ad(0.005, 0.2)).gain(0.25).out()
const b = seq("c5 g4 e4", clock(90))
b.sin().mul(b.gate.ad(0.005, 0.2)).gain(0.25).out()`,
	},
	{
		section: "Timing",
		title: "seq — a melody",
		description:
			"seq reads a pattern at a position and outputs its value, gate and trig. With no position it reads the ambient clock, one cycle per bar. Here a four-note tune, one note per beat.",
		code: `tempo(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "seq — gate and value",
		description:
			"A bass line, filtered and enveloped — s.gate shapes each note while the seq itself (its default output, the value) drives the oscillator.",
		code: `tempo(110)
const s = seq("c2 g2 c3 g2 eb2 g2 c3 d3")
s.tri()
  .lpf(81, 0.2)
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "seq — pattern language",
		description:
			"The mini-notation is a whole language of its own — rests, groups, chords, euclids and more. See the patterns page (patterns.html) for the full tour; here a taste with a rest and a subdivided beat.",
		code: `tempo(120)
const s = seq("c3 [e3 g3] ~ c4")
s.tri()
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "clockdiv — default",
		description:
			"A high pluck on every beat and a low thump on every 4th. clockdiv passes the first trig, then every 4th after it.",
		code: `const c = clock(240)
sin(84).mul(c.beat.ad(0.005, 0.08)).gain(0.2).out()
sin(48).mul(clockdiv(c.beat).ad(0.005, 0.3)).gain(0.4).out()`,
	},
	{
		section: "Timing",
		title: "clockdiv — all params",
		description:
			"Divide by 3 and reset on each bar: the low note lands on beats 1 and 4 of every bar.",
		code: `const c = clock(120)
sin(81).mul(c.beat.ad(0.005, 0.08)).gain(0.2).out()
sin(45)
  .mul(clockdiv({ trig: c.beat, by: 3, reset: c.bar }).ad(0.005, 0.3))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Timing",
		title: "clockdiv — by modulated",
		description:
			"An LFO walks the division 2→6: the low note thins out and fills back in against the steady beat.",
		code: `const c = clock(240)
sin(84).mul(c.beat.ad(0.005, 0.08)).gain(0.2).out()
sin(48)
  .mul(c.beat.clockdiv(lfo(0.1, 2, 6)).ad(0.005, 0.2))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Timing",
		title: "clockdiv — a kit from one beat (showcase)",
		description: "Hats on every beat, kick on 1 and 3, a clap once a bar — all from one clock's beat.",
		code: `const c = clock(120)
c.beat.hihat().gain(3).out()
c.beat.clockdiv(2).kick().gain(0.7).out()
c.beat.clockdiv(4).clap().gain(0.8).out()`,
	},
	{
		section: "Timing",
		title: "clockmult — default",
		description:
			"60 bpm doubled: one pluck on the first beat, then two a beat. It locks once two trigs give it the period.",
		code: `const c = clock(60)
sin(72)
  .mul(c.beat.clockmult().ad(0.005, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "clockmult — all params",
		description: "The beat times 4 steps a four-note arp: four notes a beat once locked.",
		code: `const c = clock(60)
const t = clockmult(c.beat, 4)
sin(counter(t).seq(p\`c4 e4 g4 c5\`.steps()))
  .mul(t.ad(0.005, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "clockmult — by modulated",
		description: "An LFO walks the multiplier 1→4: the hats speed up and slow down in whole steps.",
		code: `const c = clock(60)
c.beat
  .clockmult(lfo(0.1, 1, 4))
  .hihat()
  .gain(3)
  .out()`,
	},
	{
		section: "Timing",
		title: "clockmult — fast arp from a slow clock (showcase)",
		description: "A 30 bpm clock times 8: a quick eight-note arpeggio that rises and falls.",
		code: `const c = clock(30)
const t = c.beat.clockmult(8)
const s = counter(t).seq(p\`c4 e4 g4 b4 c5 b4 g4 e4\`.steps())
s.tri()
  .mul(t.ad(0.005, 0.05))
  .gain(0.3)
  .out()`,
	},

	// ======================================================================
	// Drums — kick, snare, hihat, clap
	// ======================================================================
	{
		section: "Drums",
		title: "kick — default",
		description:
			"An 808-style kick fired on each clock beat — a pitched sine thump with a click transient. The trig chains in as the default input.",
		code: `const c = tempo(120)
c.beat.kick()
  .gain(0.6)
  .out()`,
	},
	{
		section: "Drums",
		title: "kick — all params",
		description:
			"Every port: higher 60 Hz body, big pitch sweep, longer 0.4 s decay, softer click — a boomier, rounder kick.",
		code: `const c = tempo(120)
kick({ trig: c.beat, pitch: 60, sweep: 6, decay: 0.4, click: 0.15 })
  .gain(0.6)
  .out()`,
	},
	{
		section: "Drums",
		title: "kick — pitch modulated",
		description:
			"An LFO walks the kick's base pitch 40→90 Hz — the thump rises and falls in tuning between hits.",
		code: `const c = tempo(120)
c.beat.kick()
  .pitch(lfo(0.2, 40, 90))
  .gain(0.6)
  .out()`,
	},
	{
		section: "Drums",
		title: "snare — default",
		description:
			"A snare on each beat — a short tonal body plus a burst of filtered noise for the wires. Crisp and snappy.",
		code: `const c = tempo(120)
c.beat.snare()
  .gain(2)
  .out()`,
	},
	{
		section: "Drums",
		title: "snare — all params",
		description:
			"Every port: lower tone (more noise than body), longer decay, full snappy — a fatter, hissier snare.",
		code: `const c = tempo(120)
snare({ trig: c.beat, pitch: 180, tone: 0.25, decay: 0.25, snappy: 1 })
  .gain(1.5)
  .out()`,
	},
	{
		section: "Drums",
		title: "snare — snappy modulated",
		description:
			"An LFO opens the snappy control 0→1 — the noise wires brighten and dull, from a tight tick to a splashy crack.",
		code: `const c = tempo(120)
c.beat.snare()
  .snappy(lfo(0.2, 0, 1))
  .gain(2)
  .out()`,
	},
	{
		section: "Drums",
		title: "hihat — default",
		description:
			"A steady stream of hi-hats — metallic square partials plus noise, high-passed to a bright tick. Short and shimmery.",
		code: `tempo(240)
seq("c1*16").trig.hihat()
  .gain(4.5)
  .out()`,
	},
	{
		section: "Drums",
		title: "hihat — all params",
		description:
			"Every port: longer 0.12 s decay (an open hat), brighter tone, full metal — a sustained, ringing shimmer.",
		code: `tempo(240)
const t = seq("c1*32").trig
hihat({ trig: t, decay: 0.12, tone: 0.9, metal: 1 })
  .gain(7)
  .out()`,
	},
	{
		section: "Drums",
		title: "hihat — decay modulated",
		description:
			"An LFO stretches the decay 0.02→0.2 s — the hat breathes between a closed tick and an open, ringing splash.",
		code: `tempo(240)
seq("c1*16").trig.hihat()
  .decay(lfo(0.2, 0.02, 0.2))
  .gain(3.5)
  .out()`,
	},
	{
		section: "Drums",
		title: "clap — default",
		description:
			"A hand clap on each beat — four quick noise bursts and a decay tail through a bandpass. That reverby snap.",
		code: `const c = tempo(120)
c.beat.clap()
  .gain(1.3)
  .out()`,
	},
	{
		section: "Drums",
		title: "clap — all params",
		description:
			"Every port: longer 0.35 s decay and brighter tone — a wetter, more open clap with a longer tail.",
		code: `const c = tempo(120)
clap({ trig: c.beat, decay: 0.35, tone: 0.8 })
  .gain(0.9)
  .out()`,
	},
	{
		section: "Drums",
		title: "clap — tone modulated",
		description:
			"An LFO opens tone 0.2→1 — the clap darkens and brightens from a dull thump to an open, airy snap.",
		code: `const c = tempo(120)
c.beat.clap()
  .tone(lfo(0.2, 0.2, 1))
  .gain(1.3)
  .out()`,
	},
	{
		section: "Drums",
		title: "kick — showcase (a backbeat)",
		description:
			"Kick four-on-the-floor, snare on 2 and 4, hats on the eighths — three seqs, one voice each; the outputs auto-mix.",
		code: `tempo(120)
seq("c1 ~ c1 ~ c1 ~ c1 ~").trig.kick().gain(0.7).out()
seq("~ ~ c1 ~ ~ ~ c1 ~").trig.snare().gain(0.5).out()
seq("c1*8").trig.hihat().gain(0.3).out()`,
	},

	// ======================================================================
	// Bridge — patterns on knobs, counter
	// ======================================================================
	{
		section: "Bridge",
		title: "seq — a pattern on a knob",
		description:
			"A pattern fed straight into a knob becomes a seq: read at the ambient clock's position, sample-and-held. Four pitches step the oscillator, one per beat.",
		code: `tempo(150)
sin()
  .pitch(p\`48 55 60 63\`)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge",
		title: "seq — stepped cutoff (showcase)",
		description:
			"The same lifting works on any port: a pattern clicks the cutoff between four values each bar. slew it to glide.",
		code: `tempo(150)
saw(45)
  .lpf(p\`67 91 79 98\`, 0.3)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge",
		title: "counter — default",
		description:
			"counter counts trigs into a step position. A seq reading a .steps() pattern moves one step per beat — an analog step sequencer.",
		code: `const c = tempo(150)
sin()
  .pitch(counter(c.beat).seq(p\`48 55 60 67\`.steps()))
  .mul(c.beat.ad(0.005, 0.15))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Bridge",
		title: "counter — all params",
		description:
			"length 3 wraps the count, and the bar trig resets it — each four-beat bar plays 48 55 60 48, then starts again.",
		code: `const c = tempo(150)
sin()
  .pitch(counter(c.beat, { reset: c.bar, length: 3 }).seq(p\`48 55 60 67\`.steps()))
  .mul(c.beat.ad(0.005, 0.15))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Bridge",
		title: "counter — accents (showcase)",
		description:
			"Timing from one pattern, dynamics from another: a euclidean line whose accent levels step forward on each onset.",
		code: `tempo(110)
const s = seq("c2(4,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(counter(s.trig).seq(p\`0.3 0.1 0.25 0.15\`.steps()))
  .gain(0.9)
  .out()`,
	},
];
