/**
 * The vision showcase. Each patch teaches one platonic feature (llm/platonic.md).
 * These strings are the single source of truth: the site loads them into the
 * editor's Examples menu, and src/tests/core3/bridge/site-examples.test.ts
 * compiles+renders every one so the demos can never silently rot.
 *
 * Each is the BODY of a patch function (api names are in scope) — the same
 * mechanism eval-patch.ts uses, so what the test proves is what the site runs.
 */

export interface Example {
	readonly name: string;
	readonly source: string;
}

/** (a) First sound: clock + seq + saw → filter → envelope. */
const firstSound = `// a first sound: sequence a saw through a filter and envelope
clock(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.pitch.saw()
  .lpf({ cutoff: 900, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .mul(0.35)
  .out()
`;

/** (b) Patterns are values: build a hook, transform it before sequencing. */
const patternsAsValues = `// patterns are values: transform a hook before it ever sequences
clock(120)

const hook = p\`c3 [e3 g3] a3 ~\`
const line = seq(hook.rev().every(2, (q) => q.add(7)).off(1 / 8, (q) => q.add(12)))

line.pitch.tri()
  .lpf({ cutoff: 1600, res: 0.2 })
  .mul(line.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .mul(0.3)
  .out()
`;

/** (c) Pattern-as-signal: a pattern patched straight into a filter cutoff. */
const patternAsSignal = `// a pattern is just a signal: patch it into any knob
clock(120)

const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`300 1200 [2400 600] <400 1800>\`, rise: 5e-6, fall: 5e-6 })
s.pitch.saw()
  .lpf({ cutoff, res: 0.4 })
  .mul(s.gate.adsr(0.005, 0.15, 0.3, 0.1))
  .mul(0.3)
  .out()
`;

/** (d) loop() feedback: a Karplus-Strong pluck from a noise burst. */
const karplus = `// loop() feedback: a plucked string is a noise burst in a delay
clock(96)

const s = seq("c3 g3 <c4 e4> g3")
const exciter = noise().mul(s.gate.ad(0.001, 0.008)).mul(0.5)

loop((fb) =>
  exciter.add(
    fb.delay({ time: 0.006, feedback: 0, mix: 1 }).lpf({ cutoff: 2400 }).mul(0.96),
  ),
).mul(0.3).out()
`;

/** (e) Poly: a stacked chord pattern sequences all lanes at once. */
const polyChords = `// polyphony: a {stack} widens the sequencer to one lane per voice
clock(90)

const pad = seq("{c3,e3,g3} <{a2,c3,e3} {f2,a2,c3}>")
const amp = pad.gate.adsr(0.05, 0.1, 1, 0.3).slew(0.015, 0.015)
pad.pitch.tri()
  .lpf({ cutoff: p\`600 <900 1400>\`, res: 0.2 })
  .mul(amp)
  .mul(0.3)
  .out()
`;

/** (f) Drums + patstep: euclidean gates, a hat velocity stepped per trigger. */
const drums = `// drums: euclidean triggers, hat velocity stepped by patstep
clock(120)

const c = clock(120)
seq(p\`60(4,4)\`).trig.kick().mul(0.9).out()
seq("~ 60 ~ 60").trig.snare().mul(0.7).out()
seq("60*8").trig.apply((t) =>
  t.hihat({ decay: 0.04 }).mul(patstep("1 0.5 0.7 0.4", t)).mul(0.5).out(),
)
`;

export const EXAMPLES: readonly Example[] = [
	{ name: "first sound", source: firstSound },
	{ name: "patterns as values", source: patternsAsValues },
	{ name: "pattern as signal", source: patternAsSignal },
	{ name: "karplus pluck (loop)", source: karplus },
	{ name: "poly chords", source: polyChords },
	{ name: "drums + patstep", source: drums },
];

/** The patch shown when the editor first loads. */
export const DEFAULT_EXAMPLE = firstSound;
