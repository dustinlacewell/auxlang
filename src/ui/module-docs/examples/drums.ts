import type { DocExample } from "@/ui/docs-kit/doc-example";

export const DRUMS_EXAMPLES: readonly DocExample[] = [
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
];
