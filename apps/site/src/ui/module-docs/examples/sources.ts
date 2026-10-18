import type { DocExample } from "@/ui/docs-kit/doc-example";

export const SOURCES_EXAMPLES: readonly DocExample[] = [
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
];
