import type { DocExample } from "@/ui/docs-kit/doc-example";

export const COMBINATORS_EXAMPLES: readonly DocExample[] = [
	// -- Combinators ---------------------------------------------------------
	{
		section: "Combinators",
		title: "fast",
		description:
			".fast(2) crams the whole pattern into half a cycle — the line doubles speed, the clock doesn't move.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 e3\`.fast(2))
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.08))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "slow",
		description: ".slow(2) stretches the pattern across two cycles — the same line at half speed.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3\`.slow(2))
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.6, 0.2))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "rev",
		description:
			".rev() reverses the pattern within each cycle — the same four notes, played back-to-front.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3\`.rev())
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "every",
		description:
			".every(2, q => q.rev()) reverses the line on every second cycle — forward, backward, forward, backward.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3\`.every(2, q => q.rev()))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "iter",
		description:
			".iter(4) rotates the starting point one step each cycle — the phrase walks its own downbeat around over four cycles.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3\`.iter(4))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "ply",
		description:
			".ply(2) repeats each event in place — every note becomes a quick double, a stutter without changing the melody.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 e3\`.ply(2))
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "swing",
		description:
			".swing(4) delays the second eighth of each beat to a triplet's last third — a shuffle. .swingBy(amount, n) sets how late: 0 is straight.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 e3 c3 e3 g3 b3\`.swing(4))
s.tri()
  .mul(s.gate.adsr(0.003, 0.08, 0.3, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "euclid",
		description:
			".euclid(3, 8) masks the line to a euclidean rhythm — the melody survives only on the tresillo hits.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3\`.euclid(3, 8))
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "off",
		description:
			".off(1/8, q => q.add(12)) overlays a copy shifted an eighth later and an octave up — a fast echo that harmonises itself.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 ~\`.off(1 / 8, q => q.add(12)))
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.1))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Combinators",
		title: "late — against the beat",
		description:
			"A time shift needs a reference: the kick holds the grid while .late(1/8) drags the whole line an eighth behind it.",
		code: `const c = tempo(120)
c.beat.kick().gain(0.5).out()
const s = seq(p\`c3 e3 g3 b3\`.late(1 / 8))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Combinators",
		title: "early — ahead of the beat",
		description:
			".early(1/8) is .late's mirror: the line pulls an eighth AHEAD of the kick's grid instead of behind it.",
		code: `const c = tempo(120)
c.beat.kick().gain(0.5).out()
const s = seq(p\`c3 e3 g3 b3\`.early(1 / 8))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Combinators",
		title: "add",
		description:
			".add(7) transposes the payload by seven semitones — the same shape a fifth higher (pitch is semitones, so add is transpose).",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 e3\`.add(7))
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "mul",
		description:
			".mul(2) doubles the payload — on a plain number pattern used as an octave index, each step lands an octave further out.",
		code: `tempo(120)
const s = seq(p\`0 1 2 3\`.mul(12).add(48))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "compact — drop rests",
		description:
			".compact() removes rest steps instead of silencing them, so the remaining notes land back-to-back with no gap.",
		code: `tempo(120)
const s = seq(p\`c3 ~ g3 ~ e3 ~ b3 ~\`.compact())
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "range — rescale a 0..1 signal",
		description:
			".range(60, 72) maps a 0..1 pattern-as-signal into an octave of MIDI notes — same shape, a different window.",
		code: `tempo(100)
tri({ pitch: p\`0 0.3 0.6 1 0.6 0.3\`.range(60, 72) })
  .mul(lfo(0.5, 0.2, 0.5))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "mask — keep notes under a true region",
		description:
			".mask(bool) keeps events only where a second pattern is true — the melody survives on beats 1 and 3, rests elsewhere.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3\`.mask(p\`1 0 1 0\`))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "struct — re-trigger a held value",
		description:
			".struct(bool) re-fires one held note on every true step of a rhythm pattern — one pitch, a euclidean gallop.",
		code: `tempo(120)
const s = seq(p\`c3\`.struct(p\`1 1 0 1 1 0 1 0\`))
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "segment — sample into n steps",
		description:
			".segment(8) samples a slow-moving pattern into 8 discrete steps per cycle — a continuous sweep chopped into a stepped line.",
		code: `tempo(110)
const s = seq(p\`c3 g3\`.fast(0.5).segment(8))
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "clip — shorten the gate",
		description:
			".clip(0.3) scales each note's sounding duration to 30% of its slot, leaving the rest of the step silent — a staccato cut.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 e3\`.clip(0.3))
s.tri()
  .mul(s.gate.adsr(0.003, 0.03, 0.3, 0.03))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "chunk — every(n) on a rotating slice",
		description:
			".chunk(4, q => q.add(12)) transforms one quarter of the cycle each time through, octave-jumping a different slice on every cycle in turn.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3\`.chunk(4, q => q.add(12)))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "sometimes / often / rarely / always",
		description:
			"Each is .someBy at a fixed probability (0.5 / 0.75 / 0.25 / 1) — seeded per-event coin flips that transform some notes and leave others alone.",
		code: `tempo(115)
const s = seq(p\`c3 e3 g3 b3 c3 e3 g3 b3\`.sometimes(q => q.add(12)))
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "degrade",
		description:
			".degrade(0.4) turns notes into rests with 40% probability, seeded — a busy line thins out to a stumbling groove, identically every run.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3 c4 b3 g3 e3\`.degrade(0.4))
s.saw()
  .lpf({ cutoff: 91, res: 0.3 })
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.25)
  .out()`,
	},
];
