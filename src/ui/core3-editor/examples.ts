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

/** (a) First sound: tempo + seq + saw → filter → envelope. */
const firstSound = `// a first sound: sequence a saw through a filter and envelope
tempo(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.saw()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .mul(0.35)
  .out()
`;

/** (b) Patterns are values: build a hook, transform it before sequencing. */
const patternsAsValues = `// patterns are values: transform a hook before it ever sequences
tempo(120)

const hook = p\`c3 [e3 g3] a3 ~\`
const line = seq(hook.rev().every(2, (q) => q.add(7)).off(1 / 8, (q) => q.add(12)))

line.tri()
  .lpf({ cutoff: 91, res: 0.2 })
  .mul(line.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .mul(0.3)
  .out()
`;

/** (c) Pattern-as-signal: a pattern patched straight into a filter cutoff. */
const patternAsSignal = `// a pattern is just a signal: patch it into any knob
tempo(120)

const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`62 86 [98 74] <67 93>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.4 })
  .mul(s.gate.adsr(0.005, 0.15, 0.3, 0.1))
  .mul(0.3)
  .out()
`;

/** (d) loop() feedback: a Karplus-Strong pluck from a noise burst. */
const karplus = `// loop() feedback: a plucked string is a noise burst in a delay
tempo(96)

const s = seq("c3 g3 <c4 e4> g3")
const exciter = noise().mul(s.gate.ad(0.001, 0.008))

loop((fb) =>
  exciter.add(
    fb.delay({ time: 0.006, feedback: 0, mix: 1 }).lpf({ cutoff: 98 }).mul(0.99),
  ),
).mul(0.8).out()
`;

/** loop(init, f): two cross-coupled wires, each fed back one sample late. */
const crossFm = `// loop() with a record: two sines frequency-modulate each other
loop({ a: 0, b: 0 }, (fb) => ({
  a: sin(57).mod("pitch", fb.b, lfo(0.1, 2, 14)),
  b: sin(64).mod("pitch", fb.a, 12),
})).apply((v) => v.a.add(v.b).gain(0.2).out())
`;

/** beats(x): a delay time in beats, so the echo stays synced to tempo. */
const syncedEcho = `// beats(x): echo time in beats — stays synced when tempo changes
tempo(100)

const s = seq("c3 ~ g3 ~")
s.tri()
  .mul(s.gate.ad(0.005, 0.15))
  .apply((dry) => loop((fb) => dry.add(fb.delay({ time: beats(0.75), mix: 1 }).mul(0.5))))
  .gain(0.3)
  .out()
`;

/** defmod with patch: a sub-patch saved as a module, used twice. */
const subpatch = `// defmod with patch: save a sub-patch as a module, use it like any module
tempo(110)

defmod({
  name: "pluck",
  ins: { pitch: semis(48), bright: semis(91) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.pitch.saw().lpf({ cutoff: i.bright, res: 0.4 }) }),
})

const lead = seq("c4 e4 g4 <b4 a4>")
const bass = seq("c2 ~ g1 ~")
lead.pluck({ bright: 96 }).mul(lead.gate.ad(0.005, 0.2)).gain(0.2).out()
bass.pluck(79).mul(bass.gate.ad(0.005, 0.3)).gain(0.3).out()
`;

/** (e) Poly: a stacked chord pattern sequences all lanes at once. */
const polyChords = `// polyphony: a [chord] widens the sequencer to one lane per voice
tempo(90)

const pad = seq("[c3,e3,g3] <[a2,c3,e3] [f2,a2,c3]>")
const amp = pad.gate.adsr(0.05, 0.1, 1, 0.3).slew(0.015, 0.015)
pad.tri()
  .lpf({ cutoff: p\`74 <81 89>\`, res: 0.2 })
  .mul(amp)
  .mul(0.3)
  .spread()
  .out()
`;

/** (e2) Detune and spread: a pattern stack makes lanes, spread places them. */
const wideSaws = `// detune and spread: a [stack] of cent offsets added to the pitch makes
// three saws per note; spread fans the lanes left, center, right
tempo(90)

const s = seq("c3 <g2 a2> f2 <g2 e2>")
s.add(p\`[-0.12, 0, 0.12]\`)
  .saw()
  .lpf({ cutoff: 84, res: 0.2 })
  .mul(s.gate.adsr(0.01, 0.2, 0.6, 0.3))
  .mul(0.3)
  .spread()
  .out()
`;

/** (f) Drums + counter: euclidean gates, a hat velocity stepped per trigger. */
const drums = `// drums: a euclidean kick, a backbeat snare, eighth-note hats
// whose velocity a counter steps one value per hit
tempo(120)

seq(p\`60(4,4)\`).trig.kick().mul(0.9).out()
seq("~ 60 ~ 60").trig.snare().mul(0.7).out()
seq("60*8").trig.apply((t) =>
  t.hihat({ decay: 0.04 }).mul(counter(t).seq(p\`1 0.5 0.7 0.4\`.steps())).mul(0.5).out(),
)
`;

/** (f2) Seeds: pin the patch seed; hold one part with a local seed. */
const seededChance = `// seeds: seed(n) pins the dice; delete it and the editor draws a seed
// at play (shown below the editor, with reroll). The ghost line keeps
// its own seed, so it stays put when the patch seed changes.
tempo(120)
seed(7)

const hook = seq(p\`c4 e4 g4 b4\`.fast(2).degrade(0.4))
hook.tri()
  .mul(hook.gate.adsr(0.005, 0.1, 0.3, 0.1))
  .gain(0.3)
  .out()

const ghost = seq(p\`c5*8\`.degrade(0.6).seed(3))
ghost.sin()
  .mul(ghost.gate.ad(0.002, 0.05))
  .gain(0.15)
  .out()
`;

/** (g) A whole track: dub techno with a 16-bar form, mixed and tuned. */
const smokeSignal = `// smoke signal — dub techno in F minor, 122 bpm; one cycle = one bar
tempo(122)

// ---- kick: four on the floor, tuned to the tonic; bar 16 breaks ----
// drums fire on trigs; the 60s are just onsets
const kicks = seq(p\`<[60 60 60 60]!15 [60 ~ ~ ~]>\`)
kicks.trig.kick({ pitch: 43.65, sweep: 5, decay: 0.2, click: 0.05 })
  .mul(0.8)
  .out()

// ---- bass: offbeat sub on i-i-VI-VII, fills in bars two and four ----
const bass = seq(p\`<
  [[~ f1] [~ f1] [~ f1] [~ f1]]
  [[~ f1] [~ f1] [~ f1] [~ [f1 ab1]]]
  [[~ db1] [~ db1] [~ db1] [~ db1]]
  [[~ eb1] [~ eb1] [~ eb1] [eb1 [eb1 f1]]]
>\`)
bass.tri()
  .lpf({ cutoff: 63, res: 0.15 })
  .mul(bass.gate.adsr(0.008, 0.1, 0.7, 0.03))
  .mul(0.5)
  .out()

// ---- hats: offbeat eighths; the bar's last one opens, wider every 4th bar ----
const hat = seq("[~ 60]*4")
hat.trig.hihat({ decay: p\`0.025 0.025 0.025 <0.09 0.09 0.09 0.16>\`, tone: 0.8, metal: 0.7 })
  .mul(2.6)
  .pan(0.1)
  .out()

// ghost sixteenths — degrade reseeds every bar; a flurry on each bar's last beat
const ghost = seq(p\`60*4 60*4 60*4 60*8\`.degrade(0.65))
ghost.trig.hihat({ decay: 0.014, tone: 0.9, metal: 0.5 })
  .mul(1.6)
  .pan(-0.35)
  .out()

// ---- clap on two and four ----
const back = seq(p\`~ 60 ~ 60\`)
back.trig.clap({ decay: 0.22, tone: 0.55 })
  .mul(0.9)
  .out()

// ---- dub stab on the and-of-2: Fm7 · Fm7 · Dbmaj7 · Eb9 ----
const stabSeq = seq(p\`[~ [~ <[f2,ab2,c3,eb3] [f2,ab2,c3,eb3] [f2,ab2,c3,db3] [f2,g2,bb2,db3]>] ~ ~]\`)
const stab = stabSeq.saw()
  .bpf({ cutoff: lfo(0.045, 78, 88), res: 0.35 })
  .mul(stabSeq.gate.adsr(0.004, 0.16, 0, 0.1))
// delay feedback stays 0: the loop IS the feedback path, so every repeat re-passes the lpf
// a touch of reverb behind the echoes glues them into one room instead of discrete slaps
loop((fb) =>
  stab.add(fb.delay({ time: 0.369, feedback: 0, mix: 1 }).lpf({ cutoff: 86, res: 0.2 }).mul(0.22)),
)
  .reverb({ room: 0.6, damp: 0.6, mix: 0.15 })
  .mul(0.45)
  .spread()
  .out()

// ---- pad: two saws seven cents apart, above the stab's band ----
saw({ pitch: 53 }).add(saw({ pitch: 53.07 }))
  .lpf({ cutoff: lfo(0.035, 65, 78), res: 0.1 })
  .mul(0.1)
  .out()

// ---- lead: a call in bar two, an answer in bar four, silence the second pass ----
const lead = seq(p\`<
  [~ ~ ~ ~]
  [~ [~ [~ c4]] eb4 [~ f4]]
  [~ ~ ~ ~]
  [ab4 ~ [g4 f4] ~]
  [~ ~ ~ ~]!4
>\`)
lead.tri()
  .lpf({ cutoff: 97, res: 0.2 })
  .mul(lead.gate.adsr(0.006, 0.12, 0.35, 0.15))
  .delay({ time: 0.369, feedback: 0.5, mix: 0.32 })
  .mul(0.4)
  .pan(lfo(0.05, -0.4, 0.4))
  .out()
`;

/** (h) A port: eddyflux's strudel piece "coastline", now with the real vocabulary. */
const coastline = `// coastline — after eddyflux's strudel piece; lofi half-time in F minor
// one cycle = one bar; cps 0.75 -> 45 bars/min = 180 bpm in 4/4
tempo(180)

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
  .out()

// ---- ride: rd*2, masked to the back half of the form ----
const ride = seq(p\`60*2\`)
ride.trig.hihat({ decay: 0.18, tone: 0.45, metal: 0.85 })
  .mul(0.8)
  .mul(rideMask)
  .pan(0.3)
  .out()

// ---- epiano: chords.offset(-1).voicing() through a phaser and a room ----
const epiano = seq(chords.offset(-1).voicing())
epiano.tri()
  .mul(epiano.gate.adsr(0.05, 0.4, 0.7, 0.5))
  .phaser({ rate: 0.25, depth: 0.7, mix: 0.4 })
  .reverb({ room: 0.5, damp: 0.5, mix: 0.28 })
  .mul(0.26)
  .spread()
  .out()

// ---- bass: n("<0!3 1*2>").set(chords).mode("root:g2") — root, then the 3rd ----
const bassLine = chords.mode("root:g2").n(p\`<0!3 1*2>\`)
const bass = seq(bassLine)
bass.tri()
  .lpf({ cutoff: 66, res: 0.1 })
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
mel.fm({ index: lfo(0.06, 0.4, 1.6), ratio: 1 })
  .lpf({ cutoff: lfo(0.06, 66, 80), res: 0.12 })
  .mul(mel.gate.adsr(0.02, 0.25, 0, 0.16))
  .shape(0.1)
  .delay({ time: 0.25, feedback: 0.3, mix: 0.25 })
  .reverb({ room: 0.8, damp: 0.55, mix: 0.4 })
  .mul(slew({ in: perlin.range(0.6, 0.9), rise: 0.05, fall: 0.05 }))
  .mul(melodyMask)
  .mul(0.4)
  .pan(0.15)
  .out()
`;

/** (i) A mirror canon: one theme, flipped and reversed by pattern arithmetic. */
const mirrorCanon = `// mirror canon — D dorian, 100 bpm
//
// The answer is the lead turned upside down around D, four bars late.
// Dorian's steps (W H W W W H W) read the same both ways, so the flip
// never leaves the key. The lead's second half is its first half played
// backwards, so the theme, its reverse, its mirror and its reverse mirror
// all sound — and the two voices only ever meet in thirds and sixths.
tempo(100) // one cycle = one bar

const D2 = 38, D4 = 62, D5 = 74
const mirror = (q, axis) => q.mul(-1).add(2 * axis)
const eightBars = (q, turn) => p\`\${q} \${turn(q)}\`.slow(8)

// ---- harmony: four chords climb, then their mirror image falls ----
// Dm7 Em7 Fmaj7 G6 | Em7/D Dm7/C Cmaj7/B Dm7/A
const chords = p\`[a3,c4,d4,f4] [g3,b3,d4,e4] [f3,a3,c4,e4] [g3,b3,d4,e4]\`
const pad = seq(eightBars(chords, (q) => mirror(q, D4)))
pad.tri()
  .lpf(lfo(0.05, 71, 85), 0.1)
  .mul(pad.gate.adsr(0.3, 0.5, 0.7, 0.8))
  .gain(0.2)
  .spread()
  .out()

// the bass climbs D E F G; its mirror walks down D C B A
const bass = seq(eightBars(p\`d2 e2 f2 g2\`, (q) => mirror(q, D2)))
const pulse = seq("[60@3 60@3 60@2]")
bass.tri()
  .lpf(67, 0.1)
  .mul(pulse.gate.adsr(0.005, 0.2, 0.6, 0.1))
  .gain(0.45)
  .out()

// ---- the canon ----
const phrase = p\`[d5@2 a5@2 c6@2 b5 a5] [g5@3 e5 g5@2 b5@2] [a5@2 f5@2 a5 c6@3] [b5 a5 g5@2 b5@4]\`
const theme = eightBars(phrase, (q) => q.rev())
const lead = seq(theme)
const answer = seq(mirror(theme, D5).late(4))

// lead: a reedy FM voice (a 1:2 ratio keeps only odd harmonics), right
lead.add(lfo(5, -0.08, 0.08))
  .fm(1.2, 2)
  .mul(lead.gate.adsr(0.03, 0.2, 0.7, 0.25))
  .reverb({ room: 0.7, damp: 0.5, mix: 0.25 })
  .gain(0.22)
  .pan(0.35)
  .out()

// answer: a soft triangle, left; it waits four bars to enter
const entry = slew({ in: p\`<0 1 1 1 1 1 1 1>\`.slow(4), rise: 0.02, fall: 0.02 })
answer.tri()
  .lpf(93, 0.1)
  .mul(answer.gate.adsr(0.04, 0.2, 0.7, 0.25))
  .mul(entry)
  .reverb({ room: 0.7, damp: 0.5, mix: 0.25 })
  .gain(0.3)
  .pan(-0.35)
  .out()

// ---- drums: in for the middle sixteen bars of every thirty-two ----
const groove = slew({ in: p\`<0 1 1 0>\`.slow(8), rise: 0.02, fall: 0.02 })

// the kick doubles the bass's 3+3+2 pulse
seq("[60@3 60@3 ~@2]").trig
  .kick({ pitch: 55, sweep: 4, decay: 0.3, click: 0.05 })
  .mul(groove)
  .gain(0.7)
  .out()

seq("~ 60 ~ 60").trig
  .snare({ pitch: 190, tone: 0.3, decay: 0.12, snappy: 0.6 })
  .mul(groove)
  .gain(0.9)
  .out()

const hat = seq("60*8")
hat.trig
  .hihat({ decay: 0.03, tone: 0.7, metal: 0.6 })
  .mul(counter(hat.trig).seq(p\`0.5 1\`.steps()))
  .mul(groove)
  .gain(2)
  .out()
`;

/** (j) A chaconne: a composed form, grown by one glided energy curve. */
const chaconne = `// chaconne — variations over a lament bass, D minor, 80 bpm
//
// A chaconne repeats one bass line and grows variations over it. This
// ground falls by half steps, D C# C B Bb A, then cadences G A. Five
// variations of eight bars:
//   1 the ground alone          2 the theme
//   3 the theme, with motion    4 the climax: the theme redrawn in eighths
//   5 the theme stripped to one note a bar, back down to the ground
// One energy curve, written as a pattern and glided, opens the filters,
// brings the drums in and out, and fills in the harp note by note.
tempo(80) // one cycle = one 4/4 bar

// one value per variation; slew turns each step into a ~10 s swell
const energy = slew({ in: p\`<0.1 0.25 0.5 1 0.35>\`.slow(8), rise: 30, fall: 30 })

// ---- the ground ----
const ground = seq(p\`d2 c#2 c2 b1 bb1 a1 g1 a1\`.slow(8))
ground.tri()
  .lpf(62)
  .mul(ground.gate.adsr(0.05, 0.3, 0.8, 0.4))
  .gain(0.5)
  .out()

// strings, voiced so every voice moves by step:
// Dm  A7/C#  Dm/C  G/B  Gm/Bb  A  Gm7  A7
const strings = seq(p\`[a3,d4,f4] [g3,c#4,e4] [f3,d4,f4] [g3,d4,g4]
  [g3,d4,g4] [a3,c#4,e4] [bb3,d4,f4] [a3,c#4,g4]\`.slow(8))
strings.tri()
  .lpf(hz(energy.mul(1600).add(400)))
  .mul(strings.gate.adsr(0.6, 0.5, 0.8, 1))
  .gain(0.18)
  .spread()
  .out()

// ---- harp: plays sixteenths, but only the steps the energy allows ----
// steps open in metric order (bit-reversed index): downbeats, then quarters,
// then eighths, then sixteenths. Each stage is a complete figure.
const harmony = chord("<Dm A7 Dm7 G Gm A Gm7 A7>").mode("root:d3")
const harp = seq(harmony.n(p\`0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1\`))
const rank = p\`0 8 4 12 2 10 6 14 1 9 5 13 3 11 7 15\`
harp
  .fm(0.8, 1)
  .mul(harp.gate.adsr(0.002, 0.25, 0, 0.1))
  .mul(energy.mul(16).gt(rank))
  .delay({ time: 0.5625, feedback: 0.3, mix: 0.2 })
  .gain(0.2)
  .pan(-0.25)
  .out()

// ---- the melody ----
// the theme climbs D E F G against the falling bass, peaks on D6,
// sighs down a half step to C#6, and lands on the leading tone
const theme = p\`[d5@4 a4@2 d5@2] [e5@6 g5 e5] [f5@4 e5@2 f5@2] [g5@4 a5@2 b5@2]
  [g5@2 bb5@2 d6@4] [c#6@6 b5 a5] [bb5@4 a5@2 g5@2] [a5@2 g5@2 e5@2 c#5@2]\`
// the double: the same harmony in eighth notes, up to G6
const double = p\`[d5 f5 a5 d6 c6 a5 f5 a5] [g5@2 e5 g5 c#6@2 bb5 g5]
  [a5@2 f5 a5 c6@2 d6 e6] [d6@2 b5 d6 g6@4] [g6@2 f6 d6 bb5@2 c6 d6]
  [c#6@4 e6@2 c#6 a5] [d6@2 bb5 g5 f5@2 g5 bb5] [a5@2 g5 e5 c#5@4]\`
const melody = seq(p\`<~ \${theme} \${theme} \${double} \${theme.segment(8)}>\`.slow(8))
melody.slew(0.01, 0.01).add(lfo(5, -0.1, 0.1))
  .fm({ index: energy.mul(1.2).add(0.4), ratio: 1 })
  .mul(melody.gate.adsr(0.08, 0.3, 0.8, 0.4))
  .reverb({ room: 0.8, damp: 0.5, mix: 0.3 })
  .gain(0.22)
  .pan(0.15)
  .out()

// ---- drums: comparators on the energy decide when they play ----
const pulse = energy.gt(0.45).slew(2, 2)
const lift = energy.gt(0.8).slew(2, 2)

seq("60 ~ 60 ~").trig
  .kick({ pitch: 45, sweep: 3, decay: 0.45, click: 0.03 })
  .mul(pulse)
  .gain(0.5)
  .out()

seq("~ 60 ~ 60").trig
  .clap({ decay: 0.25, tone: 0.5 })
  .mul(lift)
  .gain(0.5)
  .out()

seq("[~ 60]*4").trig
  .hihat({ decay: 0.035, tone: 0.7, metal: 0.5 })
  .mul(lift)
  .gain(2)
  .out()
`;

/** (k) A dance track: an arrangement of section patterns, glided into effects. */
const pocketRocket = `// pocket rocket — future house in C, 128 bpm
//
// Form: intro 8 · build 8 · drop 8 · drop 8, then around again.
// The chords run the "royal road" (IV V iii vi) and dodge the tonic until
// the last two bars of every eight: Ab Bb C, the Mario cadence.
// The sound effects are patches too: a riser and a tape-stop dive glided
// out of section patterns, an impact, laser zaps, and a lead that talks
// through two formant filters.
tempo(128) // one cycle = one bar

// one value per 8-bar section: intro, build, drop, drop 2
const sections = (a, b, d1, d2) => p\`<\${a} \${b} \${d1} \${d2}>\`.slow(8)
const mask = (a, b, d1, d2) => slew({ in: sections(a, b, d1, d2), rise: 0.005, fall: 0.005 })
const drops = mask(0, 0, 1, 1)

// slew turns section steps into sweeps (rise/fall are seconds per unit)
const rise = slew({ in: sections(0, 1, 0, 0), rise: 15, fall: 0.001 }) // 0 → 1 over the 15 s build
const swell = rise.mul(rise)
const dive = slew({ in: sections(0, p\`0!7 [0 -12]\`, 0, 0), rise: 0.001, fall: 0.078 }) // last half bar: down an octave

// ---- harmony: Fmaj9 G9 Em7 Am9 | Fmaj9 G9 Abmaj7 Bb6 | Cadd9 ----
const chords = seq(p\`<[a3,c4,e4,g4] [b3,d4,f4,a4] [b3,d4,e4,g4] [b3,c4,e4,g4]
  [a3,c4,e4,g4] [b3,d4,f4,a4] [[ab3,c4,eb4,g4] [bb3,d4,f4,g4]] [c4,d4,e4,g4]>\`)
const bass = seq(p\`<f1 g1 e1 a1 f1 g1 [ab1 bb1] c2>\`)
const groove = mask(1, p\`1!4 0!4\`, 1, 1) // the build drops clap and sub halfway

// ---- drums ----
const beat = seq("60*4")
beat.trig
  .kick({ pitch: 50, sweep: 4, decay: 0.35, click: 0.1 })
  .mul(sections(1, p\`1!6 0!2\`, 1, 1))
  .gain(0.8)
  .out()
const pump = beat.trig.ad(0.002, 0.25).sub(1) // sidechain: duck on every kick

seq("~ 60 ~ 60").trig
  .clap({ decay: 0.3, tone: 0.6 })
  .mul(groove)
  .gain(0.7)
  .out()

const tick = seq("60*16")
tick.trig
  .hihat({ decay: 0.03, tone: 0.8, metal: 0.5 })
  .mul(counter(tick.trig).seq(p\`0.35 0.5 1 0.5\`.steps()))
  .mul(sections(1, p\`1!7 0\`, 1, 1))
  .gain(2)
  .out()

seq("[~ 60]*4").trig
  .hihat({ decay: 0.18, tone: 0.6, metal: 0.8 })
  .mul(drops)
  .gain(1.5)
  .out()

// the build's snare roll doubles in speed every two bars, then stops dead
const roll = seq(sections(p\`~\`, p\`[60*4]!2 [60*8]!2 [60*16]!2 60*32 ~\`, p\`~\`, p\`~\`))
roll.trig
  .snare({ pitch: rise.mul(200).add(180), tone: 0.4, decay: 0.1, snappy: 0.8 })
  .mul(rise.add(0.3))
  .gain(0.8)
  .out()

// ---- intro and build: a 3+3+2 pluck, its filter opening with the riser ----
const stab = seq("[60@3 60@3 60@2]*2")
chords.add(dive)
  .sqr()
  .mix()
  .lpf(hz(rise.mul(4000).add(900)), 0.3)
  .mul(stab.gate.adsr(0.002, 0.18, 0, 0.05))
  .mul(drops.sub(1))
  .delay({ time: 0.351, feedback: 0.35, mix: 0.25 })
  .gain(0.15)
  .out()

// ---- sub: the roots, ducked by the kick ----
bass.sin()
  .mul(pump)
  .mul(groove)
  .gain(0.35)
  .out()

// ---- drop: supersaw chords, two saws a fifth of a semitone apart, pumping ----
chords.add(0.1).saw()
  .add(chords.add(-0.1).saw())
  .mix()
  .lpf(lfo(0.1, 99, 111))
  .mul(chords.gate.adsr(0.01, 0.3, 0.8, 0.2))
  .mul(pump)
  .mul(drops)
  .gain(0.06)
  .out()

// offbeat bass: each note opens its filter; every 4th bar ends in a 16th-note fill
const offbeat = seq("<[~ 60]*4 [~ 60]*4 [~ 60]*4 [[~ 60]*2 60*8]>")
bass.add(12)
  .sqr()
  .lpf(hz(offbeat.gate.adsr(0.002, 0.12, 0.1, 0.05).mul(2400).add(150)), 0.5)
  .mul(offbeat.gate.adsr(0.002, 0.15, 0.6, 0.05))
  .mul(pump)
  .mul(drops)
  .gain(0.3)
  .out()

// ---- the talking lead: a saw through two formant filters, one vowel per beat ----
const hook = seq(p\`<[g4@2 a4@2 c5@2 a4 g4] [~@2 g4 a4 b4@2 d5@2] [e5@3 d5 b4@2 g4@2]
  [a4@2 c5 b4 [a4 a4 a4 a4]@2 e4@2] [g4@2 a4@2 c5@2 a4 g4] [~@2 g4 a4 b4@2 d5@2]
  [eb5@2 c5@2 d5@2 f5@2] [e5@3 d5 c5@4]>\`)
const f1 = slew({ in: p\`79 62 71 73\`, rise: 1e-4, fall: 1e-4 }) // ah ee oh eh
const f2 = slew({ in: p\`86 98 81 93\`, rise: 1e-4, fall: 1e-4 })
const mouth = hook.saw()
mouth.bpf(f1, 0.4)
  .add(mouth.bpf(f2, 0.4))
  .mul(hook.gate.adsr(0.005, 0.1, 0.8, 0.1))
  .shape(0.3)
  .mul(drops)
  .delay({ time: 0.351, feedback: 0.3, mix: 0.2 })
  .reverb({ room: 0.6, damp: 0.5, mix: 0.2 })
  .gain(0.3)
  .out()

// ---- effects ----
// riser: noise through a band-pass sweeping up the build
noise()
  .bpf(hz(swell.mul(8000).add(300)), 0.3)
  .mul(swell)
  .gain(0.6)
  .out()

// impact on each drop: a noise slam closing down, plus a sub that dives two octaves
const hit = seq(sections(p\`~\`, p\`~\`, p\`60 ~!7\`, p\`60 ~!7\`)).trig
const slam = hit.ad(0.001, 1.2)
noise()
  .lpf(hz(slam.mul(8000).add(200)))
  .add(hit.ad(0.001, 0.6).mul(36).add(24).sin())
  .mul(slam)
  .reverb({ room: 0.9, damp: 0.3, mix: 0.4 })
  .gain(0.15)
  .out()

// laser zaps: a square whose pitch falls three octaves in a tenth of a second
const zap = seq("60(5,16,2)")
const pew = zap.trig.ad(0.001, 0.1)
pew.mul(36).add(60)
  .sqr()
  .mul(pew)
  .mul(sections(0, 0, 0.6, 1))
  .delay({ time: 0.351, feedback: 0.4, mix: 0.3 })
  .gain(0.08)
  .pan(lfo(0.5, -0.8, 0.8))
  .out()
`;

export const EXAMPLES: readonly Example[] = [
	{ name: "smoke signal (a track)", source: smokeSignal },
	{ name: "coastline (after eddyflux)", source: coastline },
	{ name: "mirror canon (D dorian)", source: mirrorCanon },
	{ name: "chaconne (evolving form)", source: chaconne },
	{ name: "pocket rocket (dance)", source: pocketRocket },
	{ name: "first sound", source: firstSound },
	{ name: "patterns as values", source: patternsAsValues },
	{ name: "pattern as signal", source: patternAsSignal },
	{ name: "karplus pluck (loop)", source: karplus },
	{ name: "cross FM (loop record)", source: crossFm },
	{ name: "synced echo (beats)", source: syncedEcho },
	{ name: "sub-patch module (defmod patch)", source: subpatch },
	{ name: "poly chords", source: polyChords },
	{ name: "wide saws (detune + spread)", source: wideSaws },
	{ name: "drums + counter", source: drums },
	{ name: "seeded chance", source: seededChance },
];

/** The patch shown when the editor first loads. */
export const DEFAULT_EXAMPLE = smokeSignal;
