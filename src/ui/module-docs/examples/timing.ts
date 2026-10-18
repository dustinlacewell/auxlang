import type { DocExample } from "@/ui/docs-kit/doc-example";

export const TIMING_EXAMPLES: readonly DocExample[] = [
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
];
