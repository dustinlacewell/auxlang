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
			"Every port set: freq drives it to 220 Hz and the output is squeezed into [-0.5, 0.5] — a quiet low sine.",
		code: `sin({ freq: 220, min: -0.5, max: 0.5, phase: 0 })
  .out()`,
	},
	{
		section: "Sources",
		title: "sin — freq modulated",
		description:
			"A slow LFO sweeps the pitch between 100 and 400 Hz — a gentle siren wandering up and down.",
		code: `sin({ freq: lfo(0.2, 100, 400) })
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
		code: `sin({ freq: 220 }).gain(0.2).out()
sin({ freq: 220.5 }).gain(0.2).out()`,
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
		code: `tri({ freq: 220, min: -0.5, max: 0.5, phase: 0 })
  .out()`,
	},
	{
		section: "Sources",
		title: "tri — freq modulated",
		description:
			"A 0.2 Hz LFO sweeps the triangle 100→400 Hz — the same hollow tone, slowly climbing and falling.",
		code: `tri({ freq: lfo(0.2, 100, 400) })
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
		title: "saw — freq modulated",
		description:
			"A slow LFO sweeps the saw 100→400 Hz — a rising buzz, brightest at the top of the sweep.",
		code: `saw({ freq: lfo(0.2, 100, 400) })
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
		title: "sqr — freq modulated",
		description: "A 0.2 Hz LFO sweeps the square 100→400 Hz — the hollow tone slowly climbing.",
		code: `sqr({ freq: lfo(0.2, 100, 400) })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Sources",
		title: "lfo — default",
		description:
			"The Hz-rate modulation source: a 2 Hz sine in [0, 0.4] wobbles the gain of a steady tone.",
		code: `sin({ freq: 330 })
  .gain(lfo(2, 0, 0.4))
  .out()`,
	},
	{
		section: "Sources",
		title: "lfo — shape config",
		description:
			"shape picks the waveform (sin default, saw/tri/sqr): a square LFO chops the gain on/off.",
		code: `sin({ freq: 330 })
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
			"White noise swept by a resonant lowpass whose cutoff a slow LFO drags 300→4000 Hz — wind rising into a whistle.",
		code: `noise()
  .lpf(lfo(0.2, 300, 4000), 0.6)
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
		code: `fm({ freq: 220, index: 6, ratio: 2 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — index modulated",
		description:
			"An LFO sweeps index 0→8 — the tone grows from a clean sine into a bright bell and back.",
		code: `fm({ freq: 220, index: lfo(0.2, 0, 8) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — ratio modulated",
		description:
			"An LFO sweeps ratio 1→3 — the timbre drifts from harmonic to clangy and back.",
		code: `fm({ freq: 220, index: 4, ratio: lfo(0.2, 1, 3) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sources",
		title: "fm — showcase",
		description:
			"A plucky FM bell sequence, index driven by each note's envelope so the brightness snaps down with the pluck.",
		code: `clock(90)
const s = seq("c4 e4 g4 c5")
s.pitch
  .fm({ index: s.gate.ad(0.005, 0.3).mul(5), ratio: 1.5 })
  .gain(s.gate.ad(0.005, 0.3))
  .out()`,
	},

	// ======================================================================
	// Filters — lpf/hpf/bpf/notch
	// ======================================================================
	{
		section: "Filters",
		title: "lpf — default",
		description:
			"A buzzy saw through a lowpass at the default 1 kHz — the top harmonics are gone, leaving a rounder tone.",
		code: `saw({ freq: 110 })
  .lpf()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "lpf — all params",
		description:
			"Cutoff 600 Hz with high resonance — a narrow, whistling peak sits right at the cutoff over the muffled saw.",
		code: `saw({ freq: 110 })
  .lpf({ cutoff: 600, res: 0.85 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "lpf — cutoff modulated",
		description:
			"A slow LFO drags the cutoff 200→3000 Hz — the classic filter sweep, dark to bright and back.",
		code: `saw({ freq: 110 })
  .lpf(lfo(0.2, 200, 3000), 0.4)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "lpf — res modulated",
		description:
			"Fixed cutoff, but an LFO opens resonance 0→0.9 — the peak at the cutoff grows from flat to a sharp whistle.",
		code: `saw({ freq: 110 })
  .lpf(800, lfo(0.2, 0, 0.9))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "hpf — default",
		description:
			"A saw through a highpass at 1 kHz — the body is scooped out, leaving a thin, fizzy top.",
		code: `saw({ freq: 110 })
  .hpf()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "hpf — cutoff modulated",
		description:
			"An LFO sweeps the highpass cutoff 200→3000 Hz — the low end drains away as the sweep rises.",
		code: `saw({ freq: 110 })
  .hpf(lfo(0.2, 200, 3000), 0.4)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "bpf — default",
		description:
			"A bandpass at 1 kHz — only a slice of the saw around the cutoff survives, a nasal, telephone-like tone.",
		code: `saw({ freq: 110 })
  .bpf({ cutoff: 1000, res: 0.6 })
  .gain(0.4)
  .out()`,
	},
	{
		section: "Filters",
		title: "bpf — cutoff modulated",
		description:
			"An LFO slides the bandpass 200→3000 Hz — a wah as the surviving slice of harmonics moves up and down.",
		code: `saw({ freq: 110 })
  .bpf(lfo(0.2, 200, 3000), 0.7)
  .gain(0.4)
  .out()`,
	},
	{
		section: "Filters",
		title: "notch — default",
		description:
			"A notch at 1 kHz over noise — one narrow band is scooped out of the hiss, a subtle hollow in the wash.",
		code: `noise()
  .notch({ cutoff: 1000, res: 0.7 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Filters",
		title: "notch — cutoff modulated (showcase)",
		description:
			"An LFO sweeps the notch 200→3000 Hz over noise — a phaser-like whoosh as the missing band travels up.",
		code: `noise()
  .notch(lfo(0.2, 200, 3000), 0.8)
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
		code: `const c = clock(120)
tri({ freq: 220 })
  .mul(c.gate.ad())
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ad — all params",
		description:
			"Slow 50 ms attack, long 400 ms decay — each beat swells in and rings out, more bell than pluck.",
		code: `const c = clock(120)
tri({ freq: 220 })
  .mul(c.gate.ad(0.05, 0.4))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ad — decay modulated",
		description:
			"An LFO stretches the decay 0.05→0.6 s over time — plucks that grow longer and shorter as it breathes.",
		code: `const c = clock(120)
tri({ freq: 220 })
  .mul(c.gate.ad(0.005, lfo(0.2, 0.05, 0.6)))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ar — default",
		description:
			"An attack-release envelope tracks the clock gate — the tone holds while the gate is high, then releases.",
		code: `const c = clock(120)
tri({ freq: 220 })
  .mul(c.gate.ar())
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ar — all params",
		description:
			"Soft 80 ms attack, long 300 ms release — each gated note fades in and trails off, a pad-like swell.",
		code: `const c = clock(90)
tri({ freq: 220 })
  .mul(c.gate.ar(0.08, 0.3))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "ar — release modulated",
		description:
			"An LFO drags the release 0.05→0.6 s — the tail on each note grows and shrinks as the sweep moves.",
		code: `const c = clock(120)
tri({ freq: 220 })
  .mul(c.gate.ar(0.01, lfo(0.2, 0.05, 0.6)))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — default",
		description:
			"The full envelope on each clock beat — attack, decay to a held sustain, then release. A rounded organ-ish note.",
		code: `const c = clock(90)
tri({ freq: 220 })
  .mul(c.gate.adsr())
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — all params",
		description:
			"Every stage set: snappy attack, quick decay to a low 0.3 sustain, long release — a plucky note with a tail.",
		code: `const c = clock(90)
tri({ freq: 220 })
  .mul(c.gate.adsr(0.01, 0.12, 0.3, 0.35))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — sustain modulated",
		description:
			"An LFO moves the sustain level 0.1→0.9 — the held middle of each note rises and falls between beats.",
		code: `const c = clock(90)
tri({ freq: 220 })
  .mul(c.gate.adsr(0.01, 0.1, lfo(0.2, 0.1, 0.9), 0.2))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — attack modulated",
		description:
			"An LFO stretches the attack 0.002→0.3 s — notes shift from sharp plucks to slow swells and back.",
		code: `const c = clock(90)
tri({ freq: 220 })
  .mul(c.gate.adsr(lfo(0.2, 0.002, 0.3), 0.1, 0.5, 0.2))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Envelopes",
		title: "adsr — showcase",
		description:
			"A sequenced bass, each note shaped by a plucky ADSR and rounded by a lowpass — a bouncing, musical line.",
		code: `clock(120)
const s = seq("c2 g2 c3 eb2 g2 c3 f2 g2")
s.tri()
  .lpf(1200, 0.3)
  .mul(s.gate.adsr(0.005, 0.1, 0.4, 0.12))
  .gain(0.35)
  .out()`,
	},

	// ======================================================================
	// Effects — delay, reverb, pan, phaser, shape
	// ======================================================================
	{
		section: "Effects",
		title: "delay — default",
		description:
			"A plucked tone through the default 0.25 s delay — one clear echo trailing each note at 50% wet.",
		code: `const c = clock(90)
sin({ freq: 440 })
  .mul(c.gate.ad(0.005, 0.1))
  .delay()
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — all params",
		description:
			"Short 150 ms time, high 0.6 feedback, 0.4 mix — plucks smear into a repeating, decaying trail.",
		code: `const c = clock(90)
sin({ freq: 440 })
  .mul(c.gate.ad(0.005, 0.08))
  .delay({ time: 0.15, feedback: 0.6, mix: 0.4 })
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — time modulated",
		description:
			"An LFO slides the delay time 0.05→0.4 s — the echo spacing stretches and squeezes, a tape-warble pitch bend.",
		code: `const c = clock(90)
tri({ freq: 330 })
  .mul(c.gate.ad(0.005, 0.1))
  .delay(lfo(0.2, 0.05, 0.4), 0.5, 0.4)
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — feedback modulated",
		description:
			"An LFO opens feedback 0.1→0.85 — the echo tail lengthens from a single slap to a long repeating wash.",
		code: `const c = clock(90)
tri({ freq: 330 })
  .mul(c.gate.ad(0.005, 0.1))
  .delay(0.2, lfo(0.2, 0.1, 0.85), 0.4)
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "delay — mix modulated",
		description:
			"An LFO crossfades mix 0→0.8 — the effect fades between dry plucks and drowning echoes.",
		code: `const c = clock(90)
tri({ freq: 330 })
  .mul(c.gate.ad(0.005, 0.1))
  .delay(0.18, 0.5, lfo(0.2, 0, 0.8))
  .gain(1)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — default",
		description:
			"A plucked tone into the default reverb (room 0.5, mix 0.33) — a short, natural room tail behind each note.",
		code: `const c = clock(70)
sin({ freq: 440 })
  .mul(c.gate.ad(0.005, 0.08))
  .reverb()
  .gain(0.7)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — all params",
		description:
			"Every port: a big 0.9 room, dark 0.7 damp, fully wet — the pluck dissolves into a long, dim cathedral wash.",
		code: `const c = clock(70)
sin({ freq: 440 })
  .mul(c.gate.ad(0.005, 0.08))
  .reverb({ room: 0.9, damp: 0.7, mix: 1 })
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — room modulated",
		description:
			"An LFO sweeps room 0.2→0.95 — the tail grows from a tight closet slap to a huge decaying hall.",
		code: `const c = clock(70)
sin({ freq: 440 })
  .mul(c.gate.ad(0.005, 0.08))
  .reverb(lfo(0.15, 0.2, 0.95), 0.5, 0.7)
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — damp modulated",
		description:
			"An LFO opens damp 0→0.9 — the tail's top end darkens and brightens, from a bright glassy ring to a muffled thud.",
		code: `const c = clock(70)
sin({ freq: 440 })
  .mul(c.gate.ad(0.005, 0.08))
  .reverb(0.8, lfo(0.15, 0, 0.9), 0.7)
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "reverb — mix modulated (showcase)",
		description:
			"An LFO crossfades mix 0→1 over a sparse pattern — plucks swing between bone-dry and fully drowned in tail.",
		code: `const c = clock(70)
sin({ freq: 440 })
  .mul(c.gate.ad(0.005, 0.08))
  .reverb(0.85, 0.4, lfo(0.1, 0, 1))
  .gain(0.6)
  .out()`,
	},
	{
		section: "Effects",
		title: "pan — default",
		description:
			"A tone with pan at center (pos 0) — equal in both ears. Both jacks are patched to the master's l/r so the placement survives.",
		code: `sin({ freq: 330 })
  .gain(0.3)
  .pan()
  .apply(p => out({ l: p.l, r: p.r }))`,
	},
	{
		section: "Effects",
		title: "pan — pos modulated (showcase)",
		description:
			"A slow LFO drives pan pos -1→1 — the tone drifts hard from the left ear to the right and back; L and R trade fully.",
		code: `sin({ freq: 330 })
  .gain(0.3)
  .pan(lfo(0.3, -1, 1))
  .apply(p => out({ l: p.l, r: p.r }))`,
	},
	{
		section: "Effects",
		title: "phaser — default",
		description:
			"A saw through the default phaser — a gentle sweeping shimmer as the moving notches pass through the harmonics.",
		code: `saw({ freq: 110 })
  .phaser()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — all params",
		description:
			"Fast rate, deep sweep, high feedback, fully wet — a swirling, resonant sweep.",
		code: `saw({ freq: 110 })
  .phaser({ rate: 1.2, depth: 0.9, feedback: 0.6, mix: 0.8 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — rate modulated",
		description:
			"An LFO sweeps the phaser rate 0.1→2 Hz — the sweep itself speeds up and slows down.",
		code: `saw({ freq: 110 })
  .phaser(lfo(0.2, 0.1, 2), 0.7, 0.5)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — depth modulated",
		description:
			"An LFO opens depth 0.1→1 — the notches travel a wider range as it swells.",
		code: `saw({ freq: 110 })
  .phaser(0.5, lfo(0.2, 0.1, 1), 0.5)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — feedback modulated",
		description:
			"An LFO opens feedback 0.1→0.85 — the notches sharpen into a resonant peak.",
		code: `saw({ freq: 110 })
  .phaser({ feedback: lfo(0.2, 0.1, 0.85) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "phaser — mix modulated (showcase)",
		description:
			"An LFO crossfades mix 0→1 — swings between the dry saw and the full phaser wash.",
		code: `saw({ freq: 110 })
  .phaser(0.5, 0.7, lfo(0.2, 0, 1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "shape — default",
		description: "A sine through the default waveshaper — mild tanh warmth.",
		code: `sin({ freq: 220 })
  .shape()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "shape — all params",
		description: "Amount at 0.9 — heavy tanh saturation, a fuzzy, crunchy sine.",
		code: `sin({ freq: 220 })
  .shape({ amount: 0.9 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Effects",
		title: "shape — amount modulated (showcase)",
		description:
			"An LFO sweeps amount 0→1 — the clean sine grows into heavy fuzz and back.",
		code: `sin({ freq: 220 })
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
		code: `sin({ freq: 330 })
  .gain(0.25)
  .out()`,
	},
	{
		section: "Utils",
		title: "gain — level modulated",
		description: "An LFO on the level, 0→0.5 — tremolo. A moving gain is all tremolo is.",
		code: `sin({ freq: 330 })
  .gain(lfo(0.5, 0, 0.5))
  .out()`,
	},
	{
		section: "Utils",
		title: "mul — as ring-mod (showcase)",
		description:
			"Two audio-rate sines multiplied — ring modulation. Neither input pitch survives; you hear their sum and difference.",
		code: `sin({ freq: 330 })
  .mul(sin({ freq: 140 }))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "mul — tremolo into sidebands (showcase)",
		description:
			"Tremolo accelerated into the audio band: past ~20 Hz the wobble fuses into sideband tones — modulation becomes timbre.",
		code: `sin({ freq: 330 })
  .mul(lfo(lfo(0.1, 2, 250), 0, 1))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "vca — the canonical patch",
		description:
			"Same module as mul and gain, named for the patch: audio in, envelope on the other input. Every note in these docs is this.",
		code: `const c = clock(120)
sin({ freq: 330 })
  .vca(c.gate.adsr(0.01, 0.1, 0.6, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "vca — sidechain duck (showcase)",
		description:
			"The kick's envelope inverted (1 − env) drives the saw's vca — it ducks on every hit. The pump.",
		code: `const c = clock(120)
c.trig.kick().gain(0.7).out()
saw({ freq: 220 })
  .lpf(1400, 0.2)
  .gain(0.25)
  .vca(c.trig.ad(0.005, 0.3).sub(1))
  .out()`,
	},
	{
		section: "Utils",
		title: "slew — default",
		description:
			"A stepped LFO (sample-and-held) fed through slew — the jumps are rounded into glides. Portamento on pitch.",
		code: `const c = clock(240)
sin()
  .pitch(lfo(0.4, 40, 70).sah(c.trig).slew(0.08, 0.08))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "slew — rate modulated",
		description:
			"The same stepped pitch, but an LFO stretches the glide time 0.01→0.3 s — slides from instant jumps to lazy swoops.",
		code: `const c = clock(240)
const g = lfo(0.2, 0.01, 0.3)
sin()
  .pitch(lfo(0.4, 40, 70).sah(c.trig).slew(g, g))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "sah — default",
		description:
			"White noise sampled and held on each clock trig — a staircase of random pitches, a classic random-note generator.",
		code: `const c = clock(300)
sin()
  .pitch(noise().scale({ min: 40, max: 76 }).sah(c.trig))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "sah — showcase (random arp)",
		description:
			"Sampled noise quantized to a pentatonic scale on every trig — a tuneful random melody instead of atonal jumps.",
		code: `const c = clock(360)
const notes = noise().scale({ min: 48, max: 84 }).sah(c.trig)
sin()
  .pitch(notes.quantize({ scaleName: "minor pentatonic", root: 0, octave: 4, range: 3 }))
  .mul(c.gate.ad(0.005, 0.12))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "scale — default",
		description:
			"scale maps a bipolar LFO [-1,1] onto [0,1]: here it drives gain, a smooth tremolo from a raw LFO.",
		code: `sin({ freq: 330 })
  .gain(lfo(0.5).scale({ min: 0, max: 0.5 }))
  .out()`,
	},
	{
		section: "Utils",
		title: "scale — showcase (LFO to cutoff)",
		description:
			"A bipolar sine LFO scaled to [300, 3000] Hz drives a filter cutoff — the idiom for remapping any modulator's range.",
		code: `saw({ freq: 110 })
  .lpf(lfo(0.2).scale({ min: 300, max: 3000 }), 0.4)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — default",
		description:
			"A smooth LFO pitch snapped to the major scale — the continuous glide becomes a staircase of in-key notes.",
		code: `const c = clock(240)
sin()
  .pitch(lfo(0.3, 48, 72).quantize({ scaleName: "major", root: 0, octave: 4, range: 2 }))
  .mul(c.gate.ad(0.005, 0.12))
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — scale modulated (showcase)",
		description:
			"An LFO-swept pitch snapped to a blues scale, root walking with another LFO — a wandering but always in-key line.",
		code: `const c = clock(300)
sin()
  .pitch(lfo(0.2, 40, 76).quantize({ scaleName: "pentatonic blues", root: lfo(0.07, 0, 11), octave: 4, range: 3 }))
  .mul(c.gate.ad(0.004, 0.1))
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "mix — poly lanes to mono",
		description:
			"A stacked chord {c,e,g} is three poly lanes; mix sums them to one lane with 1/√3 scaling — the chord, folded down without clipping.",
		code: `clock(90)
const s = seq("{c3,e3,g3}")
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
		code: `clock(80)
const s = seq("{c3,e3,g3,b3,d4}")
s.tri()
  .mix()
  .lpf(lfo(0.2, 400, 3000), 0.5)
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
		title: "out — the only thing that sounds",
		description:
			"Nothing plays until it reaches out; chains that never arrive are pruned. A mono input auto-centers.",
		code: `sin({ freq: 330 })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "out — poly auto-spread (showcase)",
		description:
			"Poly lanes fan across the stereo field at constant power — a four-voice chord gets width with no pan in sight.",
		code: `clock(90)
const s = seq("{c2,g2,e3,b3}")
s.tri()
  .mul(s.gate.adsr(0.02, 0.1, 0.6, 0.2))
  .gain(0.5)
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
			"A steady 300 Hz base with an LFO-driven offset added to its freq — the pitch drifts up and down around 300.",
		code: `sin({ freq: lfo(0.3, -80, 80).add(300) })
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
		description: "1 − gate flips a gate: the note sounds where the clock is silent — the off-beats.",
		code: `const c = clock(120)
tri({ freq: 220 })
  .mul(c.gate.sub(1).ar(0.01, 0.08))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "div — sub-octave (showcase)",
		description:
			"The classic sub-oscillator: the same swept frequency divided by 2 rides an octave below, locked in tune.",
		code: `const f = lfo(0.2, 220, 440)
saw({ freq: f }).gain(0.12).out()
saw({ freq: f.div(2) }).gain(0.18).out()`,
	},
	{
		section: "Math",
		title: "div — modulated",
		description: "660 Hz divided by an LFO 1→3 — the pitch sinks toward a third and climbs back.",
		code: `sin({ freq: div({ in: 660, by: lfo(0.2, 1, 3) }) })
  .gain(0.3)
  .out()`,
	},
	{
		section: "Math",
		title: "gt — gate from LFO (showcase)",
		description:
			"A slow LFO through gt(0) becomes a square gate — the envelope opens for half of each cycle. Comparators make rhythms.",
		code: `sin({ freq: 330 })
  .mul(lfo(1).gt(0).ar(0.02, 0.1))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "gt — threshold is pulse width",
		description:
			"An LFO moves the threshold itself: higher threshold, narrower gate — the notes stretch and shrink.",
		code: `sin({ freq: 330 })
  .mul(lfo(1).gt(lfo(0.1, -0.7, 0.7)).ar(0.01, 0.05))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "lt — inverted gate",
		description:
			"lt(0) fires when the LFO is BELOW zero — the opposite half-cycle to gt, gating the down phase.",
		code: `tri({ freq: 220 })
  .mul(lfo(1).lt(0).ar(0.02, 0.15))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "lt — coin flip per beat (showcase)",
		description:
			"Sampled noise below zero opens the gate — a seeded coin flip per beat, a random rhythm that repeats every run.",
		code: `const c = clock(240)
tri({ freq: 330 })
  .mul(noise().sah(c.trig).lt(0).ar(0.01, 0.1))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Math",
		title: "eq — select a step",
		description:
			"eq gates while two signals match: a step pattern against 2 — one pluck on that step, each cycle.",
		code: `clock(120)
sin({ freq: 330 })
  .mul(eq({ in: p\`0 1 2 3\`, than: 2 }).ad(0.005, 0.2))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Math",
		title: "eq — one row, three voices (showcase)",
		description:
			"A single number row demultiplexed by three comparators — each digit is an instrument. A whole kit from one pattern.",
		code: `clock(120)
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
		code: `sin({ freq: 150 })
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
sin({ freq: 150 })
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
		code: `sin({ freq: 150 })
  .abs()
  .gain(0.4)
  .out()`,
	},
	{
		section: "Math",
		title: "abs — LFO swing to bounce",
		description:
			"The same fold on an LFO: a bipolar swing becomes unipolar humps at twice the rate — tremolo that bounces instead of sways.",
		code: `sin({ freq: 330 })
  .gain(lfo(0.5).abs().mul(0.4))
  .out()`,
	},
	{
		section: "Math",
		title: "mod — fold pitch into an octave (showcase)",
		description:
			"Pitch ramps across four octaves, taken mod 12 — the line keeps rising but folds back every octave. Wraparound is what mod is.",
		code: `sin()
  .pitch(lfo(0.2, 48, 96).mod(12).add(48))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Math",
		title: "mod — audio-rate wrap (distortion)",
		description:
			"A loud sine wrapped by mod — each overflow snaps back through zero, a harsher cousin of clip. The divisor sweeps from mangled to clean.",
		code: `sin({ freq: 150 })
  .gain(2)
  .mod(lfo(0.2, 0.4, 2.5))
  .gain(0.5)
  .out()`,
	},

	// ======================================================================
	// Timing — clock, seq
	// ======================================================================
	{
		section: "Timing",
		title: "clock — gate",
		description:
			"The clock's gate is high for the first half of every beat — here it chops a tone into steady on/off pulses.",
		code: `const c = clock(120)
sin({ freq: 330 })
  .mul(c.gate)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "clock — trig envelope",
		description:
			"The clock's trig is a single-sample spike each beat — it fires an AD envelope, turning the pulse into a clean pluck.",
		code: `const c = clock(120)
sin({ freq: 330 })
  .mul(c.trig.ad(0.005, 0.12))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Timing",
		title: "clock — bpm modulated (showcase)",
		description:
			"An LFO drags the tempo 60→240 bpm — the pluck pattern accelerates and slows, a rubato pulse.",
		code: `const c = clock(lfo(0.15, 60, 240))
tri({ freq: 220 })
  .mul(c.trig.ad(0.005, 0.1))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Timing",
		title: "seq — a melody",
		description:
			"seq turns a mini-notation string into pitch/gate/trig, clocked by the ambient clock. Here a four-note tune, once per cycle.",
		code: `clock(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "seq — gate and pitch",
		description:
			"The same sequence, filtered and enveloped — seq.gate shapes each note while seq.pitch (the default) drives the oscillator.",
		code: `clock(110)
const s = seq("c2 g2 c3 g2 eb2 g2 c3 d3")
s.tri()
  .lpf(900, 0.2)
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Timing",
		title: "seq — pattern language",
		description:
			"The mini-notation is a whole language of its own — rests, groups, chords, euclids and more. See the patterns page (patterns.html) for the full tour; here a taste with a rest and a subdivided beat.",
		code: `clock(120)
const s = seq("c3 [e3 g3] ~ c4")
s.tri()
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
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
		code: `const c = clock(120)
c.trig.kick()
  .gain(0.6)
  .out()`,
	},
	{
		section: "Drums",
		title: "kick — all params",
		description:
			"Every port: higher 60 Hz body, big pitch sweep, longer 0.4 s decay, softer click — a boomier, rounder kick.",
		code: `const c = clock(120)
kick({ trig: c.trig, pitch: 60, sweep: 6, decay: 0.4, click: 0.15 })
  .gain(0.6)
  .out()`,
	},
	{
		section: "Drums",
		title: "kick — pitch modulated",
		description:
			"An LFO walks the kick's base pitch 40→90 Hz — the thump rises and falls in tuning between hits.",
		code: `const c = clock(120)
c.trig.kick()
  .pitch(lfo(0.2, 40, 90))
  .gain(0.6)
  .out()`,
	},
	{
		section: "Drums",
		title: "snare — default",
		description:
			"A snare on each beat — a short tonal body plus a burst of filtered noise for the wires. Crisp and snappy.",
		code: `const c = clock(120)
c.trig.snare()
  .gain(2)
  .out()`,
	},
	{
		section: "Drums",
		title: "snare — all params",
		description:
			"Every port: lower tone (more noise than body), longer decay, full snappy — a fatter, hissier snare.",
		code: `const c = clock(120)
snare({ trig: c.trig, pitch: 180, tone: 0.25, decay: 0.25, snappy: 1 })
  .gain(1.5)
  .out()`,
	},
	{
		section: "Drums",
		title: "snare — snappy modulated",
		description:
			"An LFO opens the snappy control 0→1 — the noise wires brighten and dull, from a tight tick to a splashy crack.",
		code: `const c = clock(120)
c.trig.snare()
  .snappy(lfo(0.2, 0, 1))
  .gain(2)
  .out()`,
	},
	{
		section: "Drums",
		title: "hihat — default",
		description:
			"A steady stream of hi-hats — metallic square partials plus noise, high-passed to a bright tick. Short and shimmery.",
		code: `clock(240)
seq("c1*4").trig.hihat()
  .gain(4.5)
  .out()`,
	},
	{
		section: "Drums",
		title: "hihat — all params",
		description:
			"Every port: longer 0.12 s decay (an open hat), brighter tone, full metal — a sustained, ringing shimmer.",
		code: `clock(240)
const t = seq("c1*8").trig
hihat({ trig: t, decay: 0.12, tone: 0.9, metal: 1 })
  .gain(7)
  .out()`,
	},
	{
		section: "Drums",
		title: "hihat — decay modulated",
		description:
			"An LFO stretches the decay 0.02→0.2 s — the hat breathes between a closed tick and an open, ringing splash.",
		code: `clock(240)
seq("c1*4").trig.hihat()
  .decay(lfo(0.2, 0.02, 0.2))
  .gain(3.5)
  .out()`,
	},
	{
		section: "Drums",
		title: "clap — default",
		description:
			"A hand clap on each beat — four quick noise bursts and a decay tail through a bandpass. That reverby snap.",
		code: `const c = clock(120)
c.trig.clap()
  .gain(1.3)
  .out()`,
	},
	{
		section: "Drums",
		title: "clap — all params",
		description:
			"Every port: longer 0.35 s decay and brighter tone — a wetter, more open clap with a longer tail.",
		code: `const c = clock(120)
clap({ trig: c.trig, decay: 0.35, tone: 0.8 })
  .gain(0.9)
  .out()`,
	},
	{
		section: "Drums",
		title: "kick — showcase (a backbeat)",
		description:
			"Kick four-on-the-floor, snare on 2 and 4, hats on the eighths — three seqs, one voice each; the outputs auto-mix.",
		code: `clock(120)
seq("c1 ~ c1 ~ c1 ~ c1 ~").trig.kick().gain(0.7).out()
seq("~ ~ c1 ~ ~ ~ c1 ~").trig.snare().gain(0.5).out()
seq("c1*8").trig.hihat().gain(0.3).out()`,
	},

	// ======================================================================
	// Bridge — patsig, patstep
	// ======================================================================
	{
		section: "Bridge",
		title: "patsig — default",
		description:
			"A pattern fed straight into a knob becomes a patsig: queried at the clock's phase, sample-and-held. Four pitches step the oscillator — no seq.",
		code: `clock(150)
sin()
  .pitch(p\`48 55 60 63\`)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge",
		title: "patsig — stepped cutoff (showcase)",
		description:
			"The same lifting works on any port: a pattern clicks the cutoff between four values each cycle. slew it to glide.",
		code: `clock(150)
saw({ freq: 110 })
  .lpf(p\`400 1600 800 2400\`, 0.3)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge",
		title: "patstep — default",
		description:
			"One value per trigger, the pattern's own timing ignored — an analog step sequencer clocked by trig.",
		code: `const c = clock(150)
sin()
  .pitch(patstep(p\`48 55 60 67\`, c.trig))
  .mul(c.trig.ad(0.005, 0.15))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Bridge",
		title: "patstep — accents (showcase)",
		description:
			"Timing from one pattern, dynamics from another: a euclidean line whose accent levels step forward on each onset.",
		code: `clock(110)
const s = seq("c2(4,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(patstep(p\`0.3 0.1 0.25 0.15\`, s.trig))
  .gain(0.9)
  .out()`,
	},
];
