import type { DocExample } from "@/ui/docs-kit/doc-example";

export const EFFECTS_EXAMPLES: readonly DocExample[] = [
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
];
