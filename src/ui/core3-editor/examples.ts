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

/** (g) A whole track: dub techno with a 16-bar form, mixed and tuned. */
const smokeSignal = `// smoke signal — dub techno in F minor, 122 bpm
clock(122)

// ---- kick: four on the floor, tuned to the tonic; bar 16 breaks ----
// drums fire on trigs; the 60s are just onsets
const kicks = seq(p\`<[60 60 60 60]!15 [60 ~ ~ ~]>\`.slow(4))
kicks.trig.kick({ pitch: 43.65, sweep: 5, decay: 0.2, click: 0.05 })
  .mul(0.8)
  .out()

// ---- bass: offbeat sub on i-i-VI-VII, fills in bars two and four ----
const bass = seq(p\`<
  [[~ f1] [~ f1] [~ f1] [~ f1]]
  [[~ f1] [~ f1] [~ f1] [~ [f1 ab1]]]
  [[~ db1] [~ db1] [~ db1] [~ db1]]
  [[~ eb1] [~ eb1] [~ eb1] [eb1 [eb1 f1]]]
>\`.slow(4))
bass.tri()
  .lpf({ cutoff: 320, res: 0.15 })
  .mul(bass.gate.adsr(0.008, 0.1, 0.7, 0.03))
  .mul(0.5)
  .out()

// ---- hats: offbeat eighths; the bar's last one opens, wider every 4th bar ----
const hat = seq("~ 60")
hat.trig.hihat({ decay: p\`0.025 0.025 0.025 <0.09 0.09 0.09 0.16>\`.slow(4), tone: 0.8, metal: 0.7 })
  .mul(2.6)
  .pan(0.1)
  .apply((v) => out({ l: v.l, r: v.r }))

// ghost sixteenths — degrade reseeds every cycle (a beat here); a flurry each 4th bar
const ghost = seq(p\`<60*4 60*4 60*4 60*8>\`.degrade(0.65))
ghost.trig.hihat({ decay: 0.014, tone: 0.9, metal: 0.5 })
  .mul(1.6)
  .pan(-0.35)
  .apply((v) => out({ l: v.l, r: v.r }))

// ---- clap on two and four ----
const back = seq(p\`~ 60 ~ 60\`.slow(4))
back.trig.clap({ decay: 0.22, tone: 0.55 })
  .mul(0.9)
  .out()

// ---- dub stab on the and-of-2: Fm7 · Fm7 · Dbmaj7 · Eb9 ----
const stabSeq = seq(p\`[~ [~ <{f2,ab2,c3,eb3} {f2,ab2,c3,eb3} {f2,ab2,c3,db3} {f2,g2,bb2,db3}>] ~ ~]\`.slow(4))
const stab = stabSeq.saw()
  .bpf({ cutoff: sin(0.045, 750, 1350), res: 0.35 })
  .mul(stabSeq.gate.adsr(0.004, 0.16, 0, 0.1))
// delay feedback stays 0: the loop IS the feedback path, so every repeat re-passes the lpf
// a touch of reverb behind the echoes glues them into one room instead of discrete slaps
loop((fb) =>
  stab.add(fb.delay({ time: 0.369, feedback: 0, mix: 1 }).lpf({ cutoff: 1200 }).mul(0.55)),
)
  .reverb({ room: 0.6, damp: 0.6, mix: 0.15 })
  .mul(0.45)
  .out()

// ---- pad: two saws seven cents apart, above the stab's band ----
saw({ pitch: 53 }).add(saw({ pitch: 53.07 }))
  .lpf({ cutoff: sin(0.035, 350, 750), res: 0.1 })
  .mul(0.1)
  .out()

// ---- lead: a call in bar two, an answer in bar four, silence the second pass ----
const lead = seq(p\`<
  [~ ~ ~ ~]
  [~ [~ [~ c4]] eb4 [~ f4]]
  [~ ~ ~ ~]
  [ab4 ~ [g4 f4] ~]
  [~ ~ ~ ~]!4
>\`.slow(4))
lead.tri()
  .lpf({ cutoff: 2200, res: 0.2 })
  .mul(lead.gate.adsr(0.006, 0.12, 0.35, 0.15))
  .delay({ time: 0.369, feedback: 0.5, mix: 0.32 })
  .mul(0.4)
  .pan(sin(0.05, -0.4, 0.4))
  .apply((v) => out({ l: v.l, r: v.r }))
`;

/** (h) A port: eddyflux's strudel piece "coastline", now with the real vocabulary. */
const coastline = `// coastline — after eddyflux's strudel piece; lofi half-time in F minor
// one cycle = one bar; cps 0.75 -> 45 bars/min
clock(45)

// chords: Bbm9 four bars, Fm9 four bars
const chords = chord("<Bbm9 Fm9>/4")

// form masks span the arrangement, declicked via slew into smooth fades
const bandMask = slew({ in: p\`<[0 1] 1 1 1>\`.slow(16).early(0.5), rise: 0.02, fall: 0.02 })
const rideMask = slew({ in: p\`<0 0 1 1>\`.slow(16), rise: 0.02, fall: 0.02 })
const melodyMask = slew({ in: p\`<0 1 1 0>\`.slow(16), rise: 0.02, fall: 0.02 })

// ---- kick: struct("<[x*<1 2> [~@3 x]] x>") — a per-bar boom-bap figure ----
const kickSeq = seq(p\`<[[60 60] [~@3 60]] 60>\`)
kickSeq.trig.kick({ pitch: 43.65, sweep: 4, decay: 0.35, click: 0.02 })
  .mul(0.85)
  .mul(bandMask)
  .out()

// ---- rim + snare on the backbeat; a room that opens every other bar ----
const back = seq(p\`~ 60\`)
back.trig.snare({ pitch: 210, tone: 0.4, decay: 0.13, snappy: 0.8 })
  .reverb({ room: 0.4, damp: 0.5, mix: p\`<0 0.2>\` })
  .mul(1.5)
  .mul(bandMask)
  .out()

// ---- hats: n("[0 <1 3>]*<2!3 4>") — density and pitch shift per bar ----
const hats = seq(p\`[60 <62 65>]*2\`.chunk(4, (q) => q.fast(2)))
hats.trig.hihat({ decay: 0.04, tone: 0.6, metal: 0.6 })
  .mul(1.6)
  .mul(bandMask)
  .pan(-0.2)
  .apply((v) => out({ l: v.l, r: v.r }))

// ---- ride: rd*2, masked to the back half of the form ----
const ride = seq(p\`60*2\`)
ride.trig.hihat({ decay: 0.18, tone: 0.45, metal: 0.85 })
  .mul(0.8)
  .mul(rideMask)
  .pan(0.3)
  .apply((v) => out({ l: v.l, r: v.r }))

// ---- epiano: chords.offset(-1).voicing() through a phaser and a room ----
const epiano = seq(chords.offset(-1).voicing())
epiano.tri()
  .mul(epiano.gate.adsr(0.05, 0.4, 0.7, 0.5))
  .phaser({ rate: 0.25, depth: 0.7, mix: 0.4 })
  .reverb({ room: 0.5, damp: 0.5, mix: 0.28 })
  .mul(0.26)
  .out()

// ---- bass: n("<0!3 1*2>").set(chords).mode("root:g2") — root, then the 3rd ----
const bassLine = chords.mode("root:g2").n(p\`<0!3 1*2>\`)
const bass = seq(bassLine)
bass.tri()
  .lpf({ cutoff: 380, res: 0.1 })
  .mul(bass.gate.adsr(0.01, 0.3, 0.5, 0.15))
  .mul(0.5)
  .out()

// ---- melody: an arp over the chord tones, anchored under D5, with all the
//      generative motion — segment, clip, chunk, rarely-ply, perlin gain, mask
// index pattern → chord tones; segment to 4 steps, clip gate length, rare
// doubling, and a rotating quarter sped up (rand-varied gate is approximated
// by a fixed .clip since pattern clip takes a constant, not a signal)
const arp = chords.anchor("D5").n(
  p\`[0 <4 3 <2 5>>*2]\`
    .euclid(4, 8)
    .segment(4)
    .clip(0.6)
    .rarely((q) => q.ply(2))
    .chunk(4, (q) => q.fast(2)),
)
// a soft round FM tone: low index (gentle color, not a bell), warm ratio,
// mellow non-resonant filter, and a slower attack so it breathes rather than pings
// a soft round FM tone: low index (gentle color, not a bell), warm ratio,
// mellow non-resonant filter, and a slower attack so it breathes rather than pings
const mel = seq(arp)
mel.pitch.fm({ index: sin(0.06, 0.4, 1.6), ratio: 1 })
  .lpf({ cutoff: sin(0.06, 380, 820), res: 0.12 })
  .mul(mel.gate.adsr(0.02, 0.25, 0, 0.16))
  .shape(0.1)
  .delay({ time: 0.25, feedback: 0.3, mix: 0.25 })
  .reverb({ room: 0.8, damp: 0.55, mix: 0.4 })
  .mul(slew({ in: perlin.range(0.6, 0.9), rise: 0.05, fall: 0.05 }))
  .mul(melodyMask)
  .mul(0.4)
  .pan(0.15)
  .apply((v) => out({ l: v.l, r: v.r }))
`;

export const EXAMPLES: readonly Example[] = [
	{ name: "smoke signal (a track)", source: smokeSignal },
	{ name: "coastline (after eddyflux)", source: coastline },
	{ name: "first sound", source: firstSound },
	{ name: "patterns as values", source: patternsAsValues },
	{ name: "pattern as signal", source: patternAsSignal },
	{ name: "karplus pluck (loop)", source: karplus },
	{ name: "poly chords", source: polyChords },
	{ name: "drums + patstep", source: drums },
];

/** The patch shown when the editor first loads. */
export const DEFAULT_EXAMPLE = smokeSignal;
