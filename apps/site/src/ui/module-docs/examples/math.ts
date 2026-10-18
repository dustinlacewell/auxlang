import type { DocExample } from "@/ui/docs-kit/doc-example";

export const MATH_EXAMPLES: readonly DocExample[] = [
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
		title: "lfo — pitch dip",
		description: "An LFO sweeping 72→60 — the tone dips down an octave and comes back.",
		code: `sin()
  .pitch(lfo(0.2, 72, 60))
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
  .mul(g.gate.from(1).ar(0.01, 0.08))
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
];
