/**
 * The whole content of the pattern-docs page, as DATA. Every entry is a real
 * core3 patch string that must compile through the eval path and render 2 s
 * non-silent, bounded, finite — the scratch script and the vitest test both
 * hold this file to that bar so the docs can never rot.
 *
 * House style (see .claude/rules/aux-style-guide.md): the pattern is the star,
 * so the synth voice stays a plain tri/sin gated by an adsr, and only the
 * pattern or combinator under discussion varies. Descriptions say what the
 * listener should EXPECT to hear.
 */

import type { DocExample } from "@/ui/docs-kit/doc-example";

/** Nav groups: the page's sections in reading order, clustered by concept. */
export const SECTION_GROUPS: readonly {
	label: string;
	sections: readonly { name: string; label?: string }[];
}[] = [
	{
		label: "Notation",
		sections: [
			{ name: "Sequence" },
			{ name: "Rest" },
			{ name: "[ Grouping ]" },
			{ name: "< Alternation >" },
			{ name: "[ Chords, ]" },
			{ name: "{ Polymeter }" },
			{ name: "*fast" },
			{ name: "!replicate" },
			{ name: "@hold" },
			{ name: "Ties" },
			{ name: "?probability" },
			{ name: "(euclid)" },
		],
	},
	{
		label: "Combinators",
		sections: [
			{ name: "Combinators", label: "overview" },
			{ name: "Records" },
			{ name: "Determinism" },
			{ name: "Chord vocabulary" },
			{ name: "Splicing" },
		],
	},
	{
		label: "Bridge",
		sections: [
			{ name: "Bridge: pattern as signal", label: "pattern as signal" },
			{ name: "Bridge: trigger domain", label: "trigger domain" },
		],
	},
];

/** Ordered list of section headings — drives page layout order. */
export const SECTIONS: readonly string[] = SECTION_GROUPS.flatMap((g) =>
	g.sections.map((s) => s.name),
);

export const EXAMPLES: readonly DocExample[] = [
	// -- Sequence ------------------------------------------------------------
	{
		section: "Sequence",
		title: "four notes, one cycle",
		description:
			"A bare space-separated sequence: four notes, evenly dividing the cycle, rising then falling.",
		code: `tempo(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sequence",
		title: "notes and numbers mix",
		description:
			"Atoms are notes OR bare semitone numbers — here a walking bass in note names, one per cycle-step.",
		code: `tempo(110)
const s = seq("c2 g2 c3 g2 eb2 g2 c3 d3")
s.tri()
  .lpf({ cutoff: 81, res: 0.2 })
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},

	// -- Rest ----------------------------------------------------------------
	{
		section: "Rest",
		title: "~ is a rest step",
		description:
			"A tilde is a rest: a step with its gate low, so you hear notes on beats 1 and 3 with holes on 2 and 4.",
		code: `tempo(120)
const s = seq("c3 ~ g3 ~")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Rest",
		title: "rests make the groove",
		description: "Rests inside groups push notes off the beat — the holes are the groove.",
		code: `tempo(120)
const s = seq("c3 [~ e3] ~ [~ g3]")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},

	// -- [ Grouping ] --------------------------------------------------------
	{
		section: "[ Grouping ]",
		title: "subdivide one step",
		description:
			"Brackets pack a group into ONE step: beat 2 splits into two fast notes, the rest stay slow.",
		code: `tempo(120)
const s = seq("c3 [e3 g3] c3 [g3 e3]")
s.tri()
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "[ Grouping ]",
		title: "nested subdivision",
		description:
			"Groups nest: the last step is a group whose second half is itself a group — a little triplet-into-run gesture.",
		code: `tempo(115)
const s = seq("c3 e3 [g3 [b3 c4]]")
s.tri()
  .mul(s.gate.adsr(0.004, 0.07, 0.3, 0.08))
  .gain(0.3)
  .out()`,
	},

	// -- < Alternation > -----------------------------------------------------
	{
		section: "< Alternation >",
		title: "one per cycle",
		description:
			"Angle brackets pick ONE child per cycle in turn: the last step is a2 on cycle 1, b2 on cycle 2, then repeats.",
		code: `tempo(120)
const s = seq("c3 e3 g3 <a2 b2>")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "< Alternation >",
		title: "nested — a four-cycle progression",
		description:
			"Alternations nest: f2/g2 alternate inside the outer alternation — c f c g, a four-cycle progression from seven characters.",
		code: `tempo(120)
const s = seq("<c2 <f2 g2>>")
s.tri()
  .lpf({ cutoff: 81, res: 0.2 })
  .mul(s.gate.adsr(0.01, 0.2, 0.7, 0.3))
  .gain(0.3)
  .out()`,
	},

	// -- [ Chords, ] ---------------------------------------------------------
	{
		section: "[ Chords, ]",
		title: "a chord",
		description:
			"Commas inside brackets sound together — a three-voice C-major chord, packed into three poly lanes.",
		code: `tempo(90)
const s = seq("[c3,e3,g3]")
s.tri()
  .lpf({ cutoff: 89, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.25)
  .out()`,
	},
	{
		section: "[ Chords, ]",
		title: "alternating chords",
		description:
			"Each bracketed step is a chord; alternation inside swaps the harmony every cycle — I chord, then IV.",
		code: `tempo(90)
const s = seq("[c3,e3,g3] <[f3,a3,c4] [g3,b3,d4]>")
s.tri()
  .lpf({ cutoff: 89, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "[ Chords, ]",
		title: "voices: stable",
		description:
			'.voices("stable") keeps a common tone in its lane across a chord change — C3 stays in one voice into the second chord, G2 into the fourth.',
		code: `tempo(90)
const s = seq(p\`<[c3,e3,g3] [a2,c3,f3] [g2,b2,d3] [g2,c3,e3]>\`.voices("stable"))
s.tri()
  .lpf({ cutoff: 89, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "[ Chords, ]",
		title: 'voices: round-robin',
		description:
			'.voices("rr", 4) sends each note onset to the NEXT of 4 lanes in turn, so a lane\'s release keeps ringing under later notes instead of being cut off.',
		code: `tempo(130)
const s = seq(p\`c3 e3 g3 b3\`.voices("rr", 4))
s.tri()
  .mul(s.gate.ar(0.005, 0.5))
  .gain(0.18)
  .out()`,
	},

	// -- { Polymeter } -------------------------------------------------------
	{
		section: "{ Polymeter }",
		title: "three against two",
		description:
			"Layers play at the first layer's step rate: the two-note layer runs three steps per cycle, so it starts on a different note each cycle.",
		code: `tempo(100)
const s = seq("{c3 e3 g3, c4 d4}")
s.tri()
  .mul(s.gate.adsr(0.004, 0.1, 0.4, 0.1))
  .gain(0.22)
  .out()`,
	},

	// -- *fast ---------------------------------------------------------------
	{
		section: "*fast",
		title: "repeat within a step",
		description:
			"The star repeats a step in place: beat 2 fires four times inside its slot, a fast rattle against slow neighbours.",
		code: `tempo(120)
const s = seq("c3 e3*4 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "*fast",
		title: "star a group",
		description:
			"The star takes any element: a bracketed pair repeated twice inside one step — four fast notes, then a plain one.",
		code: `tempo(115)
const s = seq("[c3 g3]*2 e3")
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "*fast",
		title: "/slow stretches a group in place",
		description:
			"Slash is star's mirror: a bracketed group spread across two steps' worth of time instead of packed into one — beat 2 drags, the rest stay put.",
		code: `tempo(130)
const s = seq("c3 [e3 g3]/2 c3 e3")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},

	// -- !replicate ----------------------------------------------------------
	{
		section: "!replicate",
		title: "replicate adds steps",
		description:
			"Bang replicates a note into that many SEPARATE steps — c3!3 makes three equal steps, so the cycle is longer, not faster.",
		code: `tempo(120)
const s = seq("c3!3 g3")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "!replicate",
		title: "star vs bang",
		description:
			"The classic confusion, A/B'd by alternation: cycle one is c3*2 g3 (c3 doubled inside its step — a gallop), cycle two is c3!2 g3 (three equal steps). Same characters, different time.",
		code: `tempo(110)
const s = seq("<[c3*2 g3] [c3!2 g3]>")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},

	// -- @hold ---------------------------------------------------------------
	{
		section: "@hold",
		title: "weighted duration",
		description:
			"The at-sign gives a step extra weight — c3@3 occupies three-quarters of the cycle, then g3 gets the last quarter.",
		code: `tempo(110)
const s = seq("c3@3 g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.7, 0.2))
  .gain(0.3)
  .out()`,
	},
	{
		section: "@hold",
		title: "a long note mid-line",
		description:
			"Weights work anywhere: e3@2 takes two slots of four — the line breathes long in the middle.",
		code: `tempo(110)
const s = seq("c3 e3@2 g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.7, 0.2))
  .gain(0.3)
  .out()`,
	},

	// -- Ties ----------------------------------------------------------------
	{
		section: "Ties",
		title: "legato across steps",
		description:
			"An underscore ties a note into the next slot: the gate stays high, so c3 sustains legato through beat 2 instead of retriggering.",
		code: `tempo(110)
const s = seq("c3 _ e3 g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.8, 0.2))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Ties",
		title: "tie twice, hold three beats",
		description:
			"Each underscore extends the note one more slot: c3 holds for three of four beats, then a pickup. Ties never retrigger.",
		code: `tempo(110)
const s = seq("c3 _ _ g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.8, 0.2))
  .gain(0.3)
  .out()`,
	},

	// -- Slides --------------------------------------------------------------
	{
		section: "Slides",
		title: "slide into the next note",
		description:
			"An underscore between two notes slides: e3 and g3 arrive with no new attack, and .slide opens a glide only there. Three attacks per bar.",
		code: `tempo(110)
const s = seq("c3_e3 g3_c4 a2 e3")
const glide = s.slide.mul(0.04)
s.slew(glide, glide)
  .saw()
  .lpf(84, 0.3)
  .mul(s.gate.adsr(0.005, 0.2, 0.6, 0.1))
  .gain(0.25)
  .out()`,
	},

	// -- ?probability --------------------------------------------------------
	{
		section: "?probability",
		title: "maybe (50%)",
		description:
			"A question mark turns the note into a rest with 50% probability, seeded — the pattern thins out, but the same every run.",
		code: `tempo(120)
const s = seq("c3? e3? g3? b3?")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "?probability",
		title: "maybe (rest 25%)",
		description:
			"A probability suffix sets the rest chance: c3?0.25 sounds in most cycles, the run stays denser than plain ?.",
		code: `tempo(120)
const s = seq("c3?0.25 e3?0.25 g3?0.25 b3?0.25")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},

	// -- (euclid) ------------------------------------------------------------
	{
		section: "(euclid)",
		title: "3 in 8",
		description:
			"Euclidean notation spreads 3 hits as evenly as possible across 8 steps — the classic tresillo pulse.",
		code: `tempo(120)
const s = seq("c3(3,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "(euclid)",
		title: "3 in 8, rotated",
		description:
			"The third argument rotates the euclidean mask — same 3-in-8 density, shifted start, a different groove.",
		code: `tempo(120)
const s = seq("c3(3,8,2)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},

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

	// -- Records --------------------------------------------------------------
	{
		section: "Records",
		title: "a per-note velocity field",
		description:
			".with({ vel }) adds one output per field, sampled at each onset and held between notes — here it drives gain note by note.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 b3\`.with({ vel: p\`1 0.4 0.7 0.5\` }))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .mul(s.vel)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Records",
		title: "two fields at once",
		description:
			"A record can carry several fields — vel drives gain, cv2 bends the filter, both read from the same seq.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 b3\`.with({ vel: p\`1 0.5 0.8 0.4\`, cv2: p\`0 0.3 0.6 0.2\` }))
s.saw()
  .lpf({ cutoff: 79 })
  .mod("cutoff", s.cv2, 24)
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .mul(s.vel)
  .gain(0.3)
  .out()`,
	},

	// -- Determinism ----------------------------------------------------------
	{
		section: "Determinism",
		title: "seed(n) pins the patch",
		description:
			"seed(42) fixes every random choice in the patch — the degrade pattern thins out the same way on every run instead of drawing a fresh seed at play start.",
		code: `seed(42)
tempo(120)
const s = seq(p\`c3 e3 g3 b3 c4 b3 g3 e3\`.degrade(0.4))
s.saw()
  .lpf({ cutoff: 91, res: 0.3 })
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Determinism",
		title: "p.seed(n) pins one pattern",
		description:
			"p\`...\`.seed(n) gives ONE pattern its own seed, so it keeps its randomness even if the patch seed above it changes — the degrade here stays fixed at 9 regardless.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3 c4 b3 g3 e3\`.degrade(0.4).seed(9))
s.saw()
  .lpf({ cutoff: 91, res: 0.3 })
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.25)
  .out()`,
	},

	// -- Chord vocabulary -------------------------------------------------------
	{
		section: "Chord vocabulary",
		title: "chord(name).voicing()",
		description:
			"chord(\"Cm9\").voicing() realizes the named quality to its absolute tones and stacks them — a five-note chord from one word.",
		code: `tempo(90)
const s = seq(chord("Cm9").voicing())
s.tri()
  .lpf({ cutoff: 86, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "Chord vocabulary",
		title: "offset and mode — octave and register",
		description:
			".offset(-1) drops the voicing an octave; .mode(\"root:g2\") sets which octave the root sits in before that shift.",
		code: `tempo(90)
const s = seq(chord("Fm9").mode("root:g2").offset(-1).voicing())
s.tri()
  .lpf({ cutoff: 84, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "Chord vocabulary",
		title: "anchor — invert toward a note",
		description:
			".anchor(\"D5\") inverts the voicing so its top tone sits at or below D5, instead of always starting from the root's octave.",
		code: `tempo(90)
const s = seq(chord("Bbm9").anchor("D5").voicing())
s.tri()
  .lpf({ cutoff: 88, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "Chord vocabulary",
		title: "n / set — index chord tones by pattern",
		description:
			"chord(\"Bbm9\").n(idx) plays one tone per step of idx (0 = lowest) instead of the whole stack — an arpeggio through the chord's own tones.",
		code: `tempo(130)
const s = seq(chord("Bbm9").n(p\`0 1 2 4\`))
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},

	// -- Splicing ------------------------------------------------------------
	{
		section: "Splicing",
		title: "splice a hook",
		description:
			"Name a hook once, splice it twice — the second an octave up. Patterns are values; ${} drops them into notation.",
		code: `tempo(110)
const hook = p\`c4 e4 g4\`
const s = seq(p\`\${hook} \${hook.add(12)}\`)
s.tri()
  .mul(s.gate.adsr(0.004, 0.07, 0.3, 0.08))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Splicing",
		title: "stack a counter-line",
		description:
			".stack layers patterns simultaneously: the hook against its own reversal an octave up — a two-voice canon from one line.",
		code: `tempo(110)
const hook = p\`c3 e3 g3 e3\`
const s = seq(hook.stack(hook.rev().add(12)))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.22)
  .out()`,
	},

	// -- Bridge: pattern as signal ------------------------------------------
	{
		section: "Bridge: pattern as signal",
		title: "pattern-modulated pitch",
		description:
			"A p`...` handed to any port lifts to a stepped, sample-and-held signal. On the pitch port it IS the melody — no seq, no gates, a drone that walks.",
		code: `tempo(100)
tri({ pitch: p\`48 55 60 63\` })
  .lpf({ cutoff: 86, res: 0.2 })
  .mul(lfo(0.5, 0.2, 0.5))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge: pattern as signal",
		title: "pattern-modulated cutoff",
		description:
			"Steps click into a continuous knob like cutoff — slew glides them. The pattern subdivides and alternates like any other.",
		code: `tempo(100)
const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`67 79 [91 62] <55 103>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.5 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.25)
  .out()`,
	},

	// -- Bridge: trigger domain ---------------------------------------------
	{
		section: "Bridge: trigger domain",
		title: "step by trigger",
		description:
			"counter turns each TRIGGER into one step of position, and .steps() makes each event one step, so seq reads the next value per hit, ignoring durations — driven by the seq's trig, the accent walks 0.3, 0.1, 0.25, 0.15.",
		code: `tempo(110)
const s = seq("c2(4,8)")
const amp = counter(s.trig).seq(p\`0.3 0.1 0.25 0.15\`.steps())
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(amp)
  .gain(0.9)
  .out()`,
	},
	{
		section: "Bridge: trigger domain",
		title: "stepped by an LFO comparator",
		description:
			"Any trigger works: an LFO through .gt(0.7) fires a steady pulse, and the counter walks the value list on each — no clock involved.",
		code: `const trg = lfo(6).gt(0.7)
tri(counter(trg).seq(p\`48 52 55 60\`.steps()))
  .mul(trg.ar(0.002, 0.12))
  .gain(0.3)
  .out()`,
	},
];
