/**
 * Every runnable code block in README.md, MANIFESTO.md, and docs/user-guide.md
 * lives here as DATA — one entry per block. Both the scratch verifier
 * (src/tests/scratch/docs-snippets.ts) and the vitest mirror
 * (src/tests/core3/bridge/docs-snippets.test.ts) render each through the same
 * eval path the site uses, so a snippet that renders here is a snippet the docs
 * can quote verbatim. If a doc block changes, change it HERE and paste it back;
 * the test is what stops the docs from rotting.
 *
 * `audible: true` snippets must render >0.005 RMS (they make sound); the rest
 * only have to compile+render finite (silent utilities, structural examples).
 */

export interface Snippet {
	/** Stable id; also the label the doc block is keyed by. */
	readonly id: string;
	/** The exact source shown in the docs — the BODY of a patch function. */
	readonly code: string;
	/** True when the block is expected to produce audible output (RMS > 0.005). */
	readonly audible: boolean;
}

export const SNIPPETS: readonly Snippet[] = [
	// -- README ---------------------------------------------------------------
	{
		id: "readme-hello",
		audible: true,
		code: `clock(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .lpf({ cutoff: 900, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()`,
	},

	// -- MANIFESTO ------------------------------------------------------------
	// §3.2 notation splicing.
	{
		id: "manifesto-splice",
		audible: true,
		code: `clock(120)

const hook = p\`c4 [e4 g4] <a4 b4>\`
const line = seq(p\`\${hook} \${hook.rev().add(12)} ~ \${hook.fast(2)}\`)
line.tri()
  .mul(line.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .gain(0.3)
  .out()`,
	},
	// §4.3 pattern-as-signal (slew-declicked cutoff).
	{
		id: "manifesto-patsig",
		audible: true,
		code: `clock(120)

const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`400 800 [1600 200] <200 3200>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.4 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()`,
	},
	// §6 the patch: ambient clock, transformed pattern, envelope VCA.
	{
		id: "manifesto-patch",
		audible: true,
		code: `clock(124)

const s = seq(p\`c3 [e3 g3] <a2 b2> ~\`.every(4, (q) => q.rev()))
s.pitch.saw()
  .lpf({ cutoff: lfo(0.2, 400, 2600), res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.2))
  .gain(0.3)
  .out()`,
	},
	// §6.1 feedback: Karplus-Strong pluck from a noise burst.
	{
		id: "manifesto-loop",
		audible: true,
		code: `clock(96)

const s = seq("c3 g3 <c4 e4> g3")
const exciter = noise().mul(s.gate.ad(0.001, 0.008)).mul(0.5)
loop((fb) =>
  exciter.add(fb.delay({ time: 0.006, feedback: 0, mix: 1 }).lpf({ cutoff: 2400 }).mul(0.96)),
).gain(0.3).out()`,
	},
	// §10 closing patch, real API: pads (packed poly) + acid line (feedback) +
	// drums (euclid triggers, hat velocity stepped by a comparator), stereo pan.
	{
		id: "manifesto-closing",
		audible: true,
		code: `clock(126)

// pads: width-3 stack, packed lanes, pattern-modulated cutoff, panned wide
const padP = p\`{c3,e3,g3} <{a2,c3,e3} {f2,a2,c3}>\`.slow(2)
const pad = seq(padP)
pad.pitch.saw()
  .lpf({ cutoff: p\`400 <800 1600>\`.slow(2), res: 0.2 })
  .mul(pad.gate.adsr(0.4, 0.3, 0.7, 1.2))
  .pan(0.4)
  .apply((v) => out({ l: v.l, r: v.r }))

// acid line: transformed hook, feedback delay
const hook = p\`c2 [c2 eb2] g1 <bb1 c2>\`
const line = seq(hook.every(4, (q) => q.rev()).off(1 / 8, (q) => q.add(12).degrade(0.4)))
loop((fb) =>
  line.pitch.slew(0.03).saw()
    .lpf({ cutoff: line.gate.adsr(0.001, 0.12, 0, 0).mul(3000).add(180), res: 0.85 })
    .mul(line.gate)
    .add(fb.delay({ time: 0.35, mix: 1 }).mul(0.35)),
).gain(0.5).out()

// drums: euclidean kick, backbeat snare, hat velocity stepped by a comparator
seq(p\`60(4,4)\`).trig.kick().out()
seq("~ 60 ~ 60").trig.snare().out()
lfo(9).gt(0.7).apply((tg) => tg.hihat().mul(patstep(p\`1 0.6 0.8 0.5\`, tg)).gain(0.8).out())`,
	},

	// -- USER GUIDE -----------------------------------------------------------
	// Fundamentals: a chain reads left to right.
	{
		id: "guide-chain",
		audible: true,
		code: `tri({ freq: 220 })
  .lpf({ cutoff: 1200, res: 0.2 })
  .gain(0.3)
  .out()`,
	},
	// Value semantics: setters copy; a discarded chain is garbage, not a zombie.
	{
		id: "guide-value-semantics",
		audible: true,
		code: `const base = tri({ freq: 220 })
const bright = base.lpf({ cutoff: 3000 }) // new value; base unchanged
base.lpf({ cutoff: 400 }) // discarded — never reaches out(), so it is pruned
bright.gain(0.3).out()`,
	},
	// Ambient clock: seq needs no explicit clock.
	{
		id: "guide-ambient-clock",
		audible: true,
		code: `clock(110)
seq("c3 e3 g3")
  .tri()
  .mul(seq("c3 e3 g3").gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	// Taps: pitch (default), gate, trig off one seq.
	{
		id: "guide-taps",
		audible: true,
		code: `clock(120)
const s = seq("c3 e3 g3 e3")
s.pitch.saw()
  .lpf({ cutoff: 1400, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	// Patterns as values.
	{
		id: "guide-pattern-values",
		audible: true,
		code: `clock(110)
const hook = p\`c3 [e3 g3] a3 ~\`
seq(hook.rev().every(2, (q) => q.add(7)))
  .tri()
  .mul(seq(hook.rev().every(2, (q) => q.add(7))).gate.adsr(0.005, 0.1, 0.4, 0.15))
  .gain(0.3)
  .out()`,
	},
	// Poly: a stack widens the seq to one lane per voice.
	{
		id: "guide-poly",
		audible: true,
		code: `clock(90)
const pad = seq("{c3,e3,g3}")
pad.tri()
  .lpf({ cutoff: 1400, res: 0.2 })
  .mul(pad.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.25)
  .out()`,
	},
	// Modulation with a plain LFO (Hz-rate, sine-shaped).
	{
		id: "guide-lfo-mod",
		audible: true,
		code: `saw({ freq: 110 })
  .lpf({ cutoff: lfo(0.3, 300, 2000), res: 0.3 })
  .gain(0.3)
  .out()`,
	},
	// Pattern-as-signal driving pitch directly (no seq).
	{
		id: "guide-patsig-pitch",
		audible: true,
		code: `clock(100)
tri(p\`48 55 60 63\`)
  .lpf({ cutoff: 1200, res: 0.2 })
  .mul(lfo(0.5, 0.2, 0.5))
  .gain(0.3)
  .out()`,
	},
	// Slew-declick idiom: glide a pattern's steps into a knob.
	{
		id: "guide-slew-declick",
		audible: true,
		code: `clock(100)
const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`400 800 [1600 300] <200 3200>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.5 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.25)
  .out()`,
	},
	// loop() feedback echo.
	{
		id: "guide-loop-echo",
		audible: true,
		code: `saw({ freq: 110 })
  .mul(lfo(2).gt(0).mul(0.5))
  .apply((dry) => loop((fb) => dry.add(fb.delay({ time: 0.18, mix: 1 }).mul(0.6))))
  .gain(0.3)
  .out()`,
	},
	// Stereo: two-cable patching into out's l/r jacks.
	{
		id: "guide-stereo",
		audible: true,
		code: `clock(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .pan(lfo(0.5, -1, 1))
  .apply((v) => out({ l: v.l, r: v.r }))`,
	},
	// seq + gate + trig for drums.
	{
		id: "guide-drums",
		audible: true,
		code: `clock(120)
seq(p\`60(3,8)\`).trig.kick().gain(0.9).out()
seq("~ 60 ~ 60").trig.snare().gain(0.7).out()
seq("60*8").trig.hihat({ decay: 0.04 }).gain(0.4).out()`,
	},
	// patstep: advance a pattern by trigger, ignore duration.
	{
		id: "guide-patstep",
		audible: true,
		code: `clock(110)
const s = seq("c2(4,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(patstep(p\`0.3 0.1 0.25 0.15\`, s.trig))
  .gain(0.9)
  .out()`,
	},
	// quantize: snap an LFO-driven pitch to a scale.
	{
		id: "guide-quantize",
		audible: true,
		code: `sin()
  .pitch(lfo(0.2, 36, 72).quantize({ scaleName: "minor pentatonic", root: 0 }))
  .lpf({ cutoff: 1600, res: 0.2 })
  .gain(0.3)
  .out()`,
	},
];
