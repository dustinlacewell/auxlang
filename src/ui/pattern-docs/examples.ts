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
			{ name: "{ Stacks }" },
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
		sections: [{ name: "Combinators", label: "overview" }, { name: "Splicing" }],
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
		code: `clock(120)
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
		code: `clock(110)
const s = seq("c2 g2 c3 g2 eb2 g2 c3 d3")
s.tri()
  .lpf({ cutoff: 900, res: 0.2 })
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},

	// -- Rest ----------------------------------------------------------------
	{
		section: "Rest",
		title: "~ is silence",
		description:
			"A tilde is a rest: the gate stays low, so you hear notes on beats 1 and 3 with holes on 2 and 4.",
		code: `clock(120)
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
		code: `clock(120)
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
		code: `clock(120)
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
		code: `clock(115)
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
		code: `clock(120)
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
		code: `clock(120)
const s = seq("<c2 <f2 g2>>")
s.tri()
  .lpf({ cutoff: 900, res: 0.2 })
  .mul(s.gate.adsr(0.01, 0.2, 0.7, 0.3))
  .gain(0.3)
  .out()`,
	},

	// -- { Stacks } ----------------------------------------------------------
	{
		section: "{ Stacks }",
		title: "a chord",
		description:
			"Comma-stacks sound simultaneously — a three-voice C-major chord, packed into three poly lanes.",
		code: `clock(90)
const s = seq("{c3,e3,g3}")
s.tri()
  .lpf({ cutoff: 1400, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.25)
  .out()`,
	},
	{
		section: "{ Stacks }",
		title: "alternating chords",
		description:
			"Each stacked step is a chord; alternation inside swaps the harmony every cycle — I chord, then IV.",
		code: `clock(90)
const s = seq("{c3,e3,g3} <{f3,a3,c4} {g3,b3,d4}>")
s.tri()
  .lpf({ cutoff: 1400, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},

	// -- *fast ---------------------------------------------------------------
	{
		section: "*fast",
		title: "repeat within a step",
		description:
			"The star repeats a step in place: beat 2 fires four times inside its slot, a fast rattle against slow neighbours.",
		code: `clock(120)
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
		code: `clock(115)
const s = seq("[c3 g3]*2 e3")
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},

	// -- !replicate ----------------------------------------------------------
	{
		section: "!replicate",
		title: "replicate adds steps",
		description:
			"Bang replicates a note into that many SEPARATE steps — c3!3 makes three equal steps, so the cycle is longer, not faster.",
		code: `clock(120)
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
		code: `clock(110)
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
		code: `clock(110)
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
		code: `clock(110)
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
		code: `clock(110)
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
		code: `clock(110)
const s = seq("c3 _ _ g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.8, 0.2))
  .gain(0.3)
  .out()`,
	},

	// -- ?probability --------------------------------------------------------
	{
		section: "?probability",
		title: "maybe (50%)",
		description:
			"A question mark drops the note with 50% probability, seeded — the pattern thins out, but the same every run.",
		code: `clock(120)
const s = seq("c3? e3? g3? b3?")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "?probability",
		title: "maybe (75%)",
		description:
			"A probability suffix sets the keep-chance: c3?.75 survives most cycles, the run stays denser than plain ?.",
		code: `clock(120)
const s = seq("c3?.75 e3?.75 g3?.75 b3?.75")
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
		code: `clock(120)
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
		code: `clock(120)
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
		code: `clock(110)
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
		code: `clock(120)
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
		code: `clock(120)
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
		code: `clock(120)
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
		code: `clock(120)
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
		code: `clock(110)
const s = seq(p\`c3 e3 g3 e3\`.ply(2))
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "euclid",
		description:
			".euclid(3, 8) masks the line to a euclidean rhythm — the melody survives only on the tresillo hits.",
		code: `clock(120)
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
		code: `clock(110)
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
		code: `const c = clock(120)
c.trig.kick().gain(0.5).out()
const s = seq(p\`c3 e3 g3 b3\`.late(1 / 8))
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
		code: `clock(120)
const s = seq(p\`c3 e3 g3 e3\`.add(7))
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Combinators",
		title: "degrade",
		description:
			".degrade(0.4) drops events with 40% probability, seeded — a busy line thins out to a stumbling groove, identically every run.",
		code: `clock(120)
const s = seq(p\`c3 e3 g3 b3 c4 b3 g3 e3\`.degrade(0.4))
s.saw()
  .lpf({ cutoff: 1600, res: 0.3 })
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.25)
  .out()`,
	},

	// -- Splicing ------------------------------------------------------------
	{
		section: "Splicing",
		title: "splice a hook",
		description:
			"Name a hook once, splice it twice — the second an octave up. Patterns are values; ${} drops them into notation.",
		code: `clock(110)
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
		code: `clock(110)
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
		code: `clock(100)
tri({ pitch: p\`48 55 60 63\` })
  .lpf({ cutoff: 1200, res: 0.2 })
  .mul(lfo(0.5, 0.2, 0.5))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge: pattern as signal",
		title: "pattern-modulated cutoff",
		description:
			"Steps click into a continuous knob like cutoff — slew glides them. The pattern subdivides and alternates like any other.",
		code: `clock(100)
const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`400 800 [1600 300] <200 3200>\`, rise: 5e-6, fall: 5e-6 })
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
			"patstep advances the pattern on each TRIGGER, ignoring durations — driven by the seq's trig, it emits the next value per hit.",
		code: `clock(110)
const s = seq("c2(4,8)")
const amp = patstep(p\`0.3 0.1 0.25 0.15\`, s.trig)
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
			"Any trigger works: an LFO through .gt(0.7) fires an irregular pulse, and patstep walks its value list on each — no clock division involved.",
		code: `clock(110)
const trg = lfo(6).gt(0.7)
tri(patstep(p\`48 52 55 60\`, trg))
  .mul(trg.ar(0.002, 0.12))
  .gain(0.3)
  .out()`,
	},
];
