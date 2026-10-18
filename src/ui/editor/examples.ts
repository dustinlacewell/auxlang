/**
 * The vision showcase. Each patch teaches one platonic feature (llm/platonic.md).
 * These strings are the single source of truth: the site loads them into the
 * editor's Examples menu, and src/tests/engine/bridge/site-examples.test.ts
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
const firstSound = `tempo(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.saw()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .mul(0.35)
  .out()
`;

/** Live controls: widgets that play the patch with no re-eval; any number drags. */
const liveControls = `tempo(118)

const s = seq("c3 e3 g3 <b2 a2> c4 g3 e3 <d3 f3>")
const pad = xy(0.5, 0.3, 0, 1)

s.saw()
  .lpf({ cutoff: slider(84, 60, 110), res: knob(0.3, 0, 0.9) })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .delay({ time: 0.3, feedback: pad.y, mix: toggle(1).mul(0.35) })
  .gain(0.3)
  .pan(pad.x.scale(0, 1, -1, 1))
  .out()

button().trig.kick().gain(0.5).out()
`;

/** (b) Patterns are values: build a hook, transform it before sequencing. */
const patternsAsValues = `tempo(120)

const hook = p\`c3 [e3 g3] a3 ~\`
const line = seq(hook.rev().every(2, (q) => q.add(7)).off(1 / 8, (q) => q.add(12)))

line.tri()
  .lpf({ cutoff: 91, res: 0.2 })
  .mul(line.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .mul(0.3)
  .out()
`;

/** (c) Pattern-as-signal: a pattern patched straight into a filter cutoff. */
const patternAsSignal = `tempo(120)

const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`62 86 [98 74] <67 93>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.4 })
  .mul(s.gate.adsr(0.005, 0.15, 0.3, 0.1))
  .mul(0.3)
  .out()
`;

/** (d) loop() feedback: a Karplus-Strong pluck from a noise burst. */
const karplus = `tempo(96)

const s = seq("c3 g3 <c4 e4> g3")
const exciter = noise().mul(s.gate.ad(0.001, 0.008))

loop((fb) =>
  exciter.add(
    fb.delay({ time: 0.006, feedback: 0, mix: 1 }).lpf({ cutoff: 98 }).mul(0.99),
  ),
).mul(0.8).out()
`;

/** loop(init, f): two cross-coupled wires, each fed back one sample late. */
const crossFm = `loop({ a: 0, b: 0 }, (fb) => ({
  a: sin(57).mod("pitch", fb.b, lfo(0.1, 2, 14)),
  b: sin(64).mod("pitch", fb.a, 12),
})).apply((v) => v.a.add(v.b).gain(0.2).out())
`;

/** beats(x): a delay time in beats, so the echo stays synced to tempo. */
const syncedEcho = `tempo(100)

const s = seq("c3 ~ g3 ~")
s.tri()
  .mul(s.gate.ad(0.005, 0.15))
  .apply((dry) => loop((fb) => dry.add(fb.delay({ time: beats(0.75), mix: 1 }).mul(0.5))))
  .gain(0.3)
  .out()
`;

/** defmod: a module written in the DSP language; edit it while it plays. */
const liveModule = `tempo(110)

function readAt(buf, pos) {
  const n = buf.length
  const i = Math.floor(pos)
  const a = buf[((i % n) + n) % n]
  const b = buf[(((i + 1) % n) + n) % n]
  return a + (b - a) * (pos - i)
}

defmod("echo", ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  let t = 0.3
  return ({ in: x = 0, time = secs(0.3, 0.05, 1), fb = range(0.5, 0, 0.95) }) => {
    t += (time - t) * 0.001
    const y = x + readAt(buf, w - t * sr) * fb
    buf[w] = y
    w = (w + 1) % buf.length
    return y
  }
})

const s = seq("c4 e4 g4 ~")
s.tri()
  .mul(s.gate.ad(0.005, 0.15))
  .echo({ time: 0.3, fb: 0.5 })
  .gain(0.3)
  .out()
`;

/** defpatch: a sub-patch saved as a module, used twice. */
const subpatch = `tempo(110)

defpatch("pluck", ({ pitch = 48, bright = 91 }) => pitch.saw().lpf({ cutoff: bright, res: 0.4 }))

const lead = seq("c4 e4 g4 <b4 a4>")
const bass = seq("c2 ~ g1 ~")
lead.pluck({ bright: 96 }).mul(lead.gate.ad(0.005, 0.2)).gain(0.2).out()
bass.pluck(79).mul(bass.gate.ad(0.005, 0.3)).gain(0.3).out()
`;

/** (e) Poly: a stacked chord pattern sequences all lanes at once. */
const polyChords = `tempo(90)

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
const wideSaws = `tempo(90)

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
const drums = `tempo(120)

seq(p\`60(4,4)\`).trig.kick().mul(0.9).out()
seq("~ 60 ~ 60").trig.snare().mul(0.7).out()
seq("60*8").trig.apply((t) =>
  t.hihat({ decay: 0.04 }).mul(counter(t).seq(p\`1 0.5 0.7 0.4\`.steps())).mul(0.5).out(),
)
`;

/** Mixer: named channels summed with per-channel levels. */
const namedMixer = `tempo(110)

const lead = seq("c4 e4 g4 b4")
const bass = seq("c3 ~ g2 ~")
const drums = seq("60*4")

const leadVoice = lead.tri().mul(lead.gate.adsr(0.005, 0.1, 0.4, 0.1))
const bassVoice = bass.tri().mul(bass.gate.adsr(0.01, 0.2, 0.7, 0.2))
const kickVoice = drums.trig.kick()

mixer({ lead: leadVoice, bass: bassVoice, drums: kickVoice })
  .level({ lead: 0.3, bass: 0.5, drums: 0.8 })
  .mod("level.lead", lfo(0.2), 0.15)
  .out()
`;

/** Signal splicing: a pattern switches a filter cutoff between live cables. */
const signalSplice = `tempo(110)

const s = seq("c2 c2 c2 c2")
const wobble = lfo(0.3, 60, 96)
s.saw()
  .lpf({ cutoff: p\`\${wobble} 80\` })
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.1))
  .mul(0.3)
  .out()
`;

/** Pattern records: a field pattern rides alongside the note pattern. */
const patternRecords = `tempo(120)

const s = seq(p\`c3 e3 g3 b3\`.with({ vel: p\`1 0.4 0.7 0.5\` }))
s.tri()
  .lpf({ cutoff: 86, res: 0.2 })
  .mul(s.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .mul(s.vel)
  .mul(0.3)
  .out()
`;

/** (f2) Seeds: pin the patch seed; hold one part with a local seed. */
const seededChance = `tempo(120)
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
const smokeSignal = `tempo(122)

// kick
const kicks = seq(p\`<[60 60 60 60]!15 [60 ~ ~ ~]>\`)
kicks.trig.kick({ pitch: 43.65, sweep: 5, decay: 0.2, click: 0.05 })
  .mul(0.8)
  .out()

// bass
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

// hats
const hat = seq("[~ 60]*4")
hat.trig.hihat({ decay: p\`0.025 0.025 0.025 <0.09 0.09 0.09 0.16>\`, tone: 0.8, metal: 0.7 })
  .mul(2.6)
  .pan(0.1)
  .out()

// ghost hats
const ghost = seq(p\`60*4 60*4 60*4 60*8\`.degrade(0.65))
ghost.trig.hihat({ decay: 0.014, tone: 0.9, metal: 0.5 })
  .mul(1.6)
  .pan(-0.35)
  .out()

// clap
const back = seq(p\`~ 60 ~ 60\`)
back.trig.clap({ decay: 0.22, tone: 0.55 })
  .mul(0.9)
  .out()

// dub stab
const stabSeq = seq(p\`[~ [~ <[f2,ab2,c3,eb3] [f2,ab2,c3,eb3] [f2,ab2,c3,db3] [f2,g2,bb2,db3]>] ~ ~]\`)
const stab = stabSeq.saw()
  .bpf({ cutoff: lfo(0.045, 78, 88), res: 0.35 })
  .mul(stabSeq.gate.adsr(0.004, 0.16, 0, 0.1))
loop((fb) =>
  stab.add(fb.delay({ time: 0.369, feedback: 0, mix: 1 }).lpf({ cutoff: 86, res: 0.2 }).mul(0.22)),
)
  .reverb({ room: 0.6, damp: 0.6, mix: 0.15 })
  .mul(0.45)
  .spread()
  .out()

// pad
saw({ pitch: 53 }).add(saw({ pitch: 53.07 }))
  .lpf({ cutoff: lfo(0.035, 65, 78), res: 0.1 })
  .mul(0.1)
  .out()

// lead
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
const coastline = `tempo(180)

// chords
const chords = chord("<Bbm9 Fm9>/4")

const bandMask = slew({ in: p\`<[0 1] 1 1 1>\`.slow(16).early(0.5), rise: 0.02, fall: 0.02 })
const rideMask = slew({ in: p\`<0 0 1 1>\`.slow(16), rise: 0.02, fall: 0.02 })
const melodyMask = slew({ in: p\`<0 1 1 0>\`.slow(16), rise: 0.02, fall: 0.02 })

// kick
const kickSeq = seq(p\`<[[60 60] [~@3 60]] 60>\`)
kickSeq.trig.kick({ pitch: 43.65, sweep: 4, decay: 0.35, click: 0.02 })
  .mul(0.85)
  .mul(bandMask)
  .out()

// snare
const back = seq(p\`~ 60\`)
back.trig.snare({ pitch: 210, tone: 0.4, decay: 0.13, snappy: 0.8 })
  .reverb({ room: 0.4, damp: 0.5, mix: p\`<0 0.2>\` })
  .mul(1.5)
  .mul(bandMask)
  .out()

// hats
const hats = seq(p\`[60 <62 65>]*2\`.chunk(4, (q) => q.fast(2)))
hats.trig.hihat({ decay: 0.04, tone: 0.6, metal: 0.6 })
  .mul(1.6)
  .mul(bandMask)
  .pan(-0.2)
  .out()

// ride
const ride = seq(p\`60*2\`)
ride.trig.hihat({ decay: 0.18, tone: 0.45, metal: 0.85 })
  .mul(0.8)
  .mul(rideMask)
  .pan(0.3)
  .out()

// epiano
const epiano = seq(chords.offset(-1).voicing())
epiano.tri()
  .mul(epiano.gate.adsr(0.05, 0.4, 0.7, 0.5))
  .phaser({ rate: 0.25, depth: 0.7, mix: 0.4 })
  .reverb({ room: 0.5, damp: 0.5, mix: 0.28 })
  .mul(0.26)
  .spread()
  .out()

// bass
const bassLine = chords.mode("root:g2").n(p\`<0!3 1*2>\`)
const bass = seq(bassLine)
bass.tri()
  .lpf({ cutoff: 66, res: 0.1 })
  .mul(bass.gate.adsr(0.01, 0.3, 0.5, 0.15))
  .mul(0.5)
  .out()

// melody
const arp = chords.anchor("D5").n(
  p\`[0 <4 3 <2 5>>*2]\`
    .euclid(4, 8)
    .segment(4)
    .clip(0.6)
    .rarely((q) => q.ply(2))
    .chunk(4, (q) => q.fast(2)),
)
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
const mirrorCanon = `tempo(100)

const D2 = 38, D4 = 62, D5 = 74
const mirror = (q, axis) => q.mul(-1).add(2 * axis)
const eightBars = (q, turn) => p\`\${q} \${turn(q)}\`.slow(8)

// harmony
const chords = p\`[a3,c4,d4,f4] [g3,b3,d4,e4] [f3,a3,c4,e4] [g3,b3,d4,e4]\`
const pad = seq(eightBars(chords, (q) => mirror(q, D4)))
pad.tri()
  .lpf(lfo(0.05, 71, 85), 0.1)
  .mul(pad.gate.adsr(0.3, 0.5, 0.7, 0.8))
  .gain(0.2)
  .spread()
  .out()

// bass
const bass = seq(eightBars(p\`d2 e2 f2 g2\`, (q) => mirror(q, D2)))
const pulse = seq("[60@3 60@3 60@2]")
bass.tri()
  .lpf(67, 0.1)
  .mul(pulse.gate.adsr(0.005, 0.2, 0.6, 0.1))
  .gain(0.45)
  .out()

// canon
const phrase = p\`[d5@2 a5@2 c6@2 b5 a5] [g5@3 e5 g5@2 b5@2] [a5@2 f5@2 a5 c6@3] [b5 a5 g5@2 b5@4]\`
const theme = eightBars(phrase, (q) => q.rev())
const lead = seq(theme)
const answer = seq(mirror(theme, D5).late(4))

// lead
lead.add(lfo(5, -0.08, 0.08))
  .fm(1.2, 2)
  .mul(lead.gate.adsr(0.03, 0.2, 0.7, 0.25))
  .reverb({ room: 0.7, damp: 0.5, mix: 0.25 })
  .gain(0.22)
  .pan(0.35)
  .out()

// answer
const entry = slew({ in: p\`<0 1 1 1 1 1 1 1>\`.slow(4), rise: 0.02, fall: 0.02 })
answer.tri()
  .lpf(93, 0.1)
  .mul(answer.gate.adsr(0.04, 0.2, 0.7, 0.25))
  .mul(entry)
  .reverb({ room: 0.7, damp: 0.5, mix: 0.25 })
  .gain(0.3)
  .pan(-0.35)
  .out()

// drums
const groove = slew({ in: p\`<0 1 1 0>\`.slow(8), rise: 0.02, fall: 0.02 })

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
const chaconne = `tempo(80)

const energy = slew({ in: p\`<0.1 0.25 0.5 1 0.35>\`.slow(8), rise: 30, fall: 30 })

// ground
const ground = seq(p\`d2 c#2 c2 b1 bb1 a1 g1 a1\`.slow(8))
ground.tri()
  .lpf(62)
  .mul(ground.gate.adsr(0.05, 0.3, 0.8, 0.4))
  .gain(0.5)
  .out()

// strings
const strings = seq(p\`[a3,d4,f4] [g3,c#4,e4] [f3,d4,f4] [g3,d4,g4]
  [g3,d4,g4] [a3,c#4,e4] [bb3,d4,f4] [a3,c#4,g4]\`.slow(8))
strings.tri()
  .lpf(hz(energy.mul(1600).add(400)))
  .mul(strings.gate.adsr(0.6, 0.5, 0.8, 1))
  .gain(0.18)
  .spread()
  .out()

// harp
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

// melody
const theme = p\`[d5@4 a4@2 d5@2] [e5@6 g5 e5] [f5@4 e5@2 f5@2] [g5@4 a5@2 b5@2]
  [g5@2 bb5@2 d6@4] [c#6@6 b5 a5] [bb5@4 a5@2 g5@2] [a5@2 g5@2 e5@2 c#5@2]\`
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

// drums
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
const pocketRocket = `tempo(128)

const sections = (a, b, d1, d2) => p\`<\${a} \${b} \${d1} \${d2}>\`.slow(8)
const mask = (a, b, d1, d2) => slew({ in: sections(a, b, d1, d2), rise: 0.005, fall: 0.005 })
const drops = mask(0, 0, 1, 1)

const rise = slew({ in: sections(0, 1, 0, 0), rise: 15, fall: 0.001 })
const swell = rise.mul(rise)
const dive = slew({ in: sections(0, p\`0!7 [0 -12]\`, 0, 0), rise: 0.001, fall: 0.078 })

// harmony
const chords = seq(p\`<[a3,c4,e4,g4] [b3,d4,f4,a4] [b3,d4,e4,g4] [b3,c4,e4,g4]
  [a3,c4,e4,g4] [b3,d4,f4,a4] [[ab3,c4,eb4,g4] [bb3,d4,f4,g4]] [c4,d4,e4,g4]>\`)
const bass = seq(p\`<f1 g1 e1 a1 f1 g1 [ab1 bb1] c2>\`)
const groove = mask(1, p\`1!4 0!4\`, 1, 1)

// drums
const beat = seq("60*4")
beat.trig
  .kick({ pitch: 50, sweep: 4, decay: 0.35, click: 0.1 })
  .mul(sections(1, p\`1!6 0!2\`, 1, 1))
  .gain(0.8)
  .out()
const pump = beat.trig.ad(0.002, 0.25).sub(1)

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

// snare roll
const roll = seq(sections(p\`~\`, p\`[60*4]!2 [60*8]!2 [60*16]!2 60*32 ~\`, p\`~\`, p\`~\`))
roll.trig
  .snare({ pitch: rise.mul(200).add(180), tone: 0.4, decay: 0.1, snappy: 0.8 })
  .mul(rise.add(0.3))
  .gain(0.8)
  .out()

// stab
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

// sub
bass.sin()
  .mul(pump)
  .mul(groove)
  .gain(0.35)
  .out()

// drop chords
chords.add(0.1).saw()
  .add(chords.add(-0.1).saw())
  .mix()
  .lpf(lfo(0.1, 99, 111))
  .mul(chords.gate.adsr(0.01, 0.3, 0.8, 0.2))
  .mul(pump)
  .mul(drops)
  .gain(0.06)
  .out()

// offbeat bass
const offbeat = seq("<[~ 60]*4 [~ 60]*4 [~ 60]*4 [[~ 60]*2 60*8]>")
bass.add(12)
  .sqr()
  .lpf(hz(offbeat.gate.adsr(0.002, 0.12, 0.1, 0.05).mul(2400).add(150)), 0.5)
  .mul(offbeat.gate.adsr(0.002, 0.15, 0.6, 0.05))
  .mul(pump)
  .mul(drops)
  .gain(0.3)
  .out()

// talking lead
const hook = seq(p\`<[g4@2 a4@2 c5@2 a4 g4] [~@2 g4 a4 b4@2 d5@2] [e5@3 d5 b4@2 g4@2]
  [a4@2 c5 b4 [a4 a4 a4 a4]@2 e4@2] [g4@2 a4@2 c5@2 a4 g4] [~@2 g4 a4 b4@2 d5@2]
  [eb5@2 c5@2 d5@2 f5@2] [e5@3 d5 c5@4]>\`)
const f1 = slew({ in: p\`79 62 71 73\`, rise: 1e-4, fall: 1e-4 })
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

// riser
noise()
  .bpf(hz(swell.mul(8000).add(300)), 0.3)
  .mul(swell)
  .gain(0.6)
  .out()

// impact
const hit = seq(sections(p\`~\`, p\`~\`, p\`60 ~!7\`, p\`60 ~!7\`)).trig
const slam = hit.ad(0.001, 1.2)
noise()
  .lpf(hz(slam.mul(8000).add(200)))
  .add(hit.ad(0.001, 0.6).mul(36).add(24).sin())
  .mul(slam)
  .reverb({ room: 0.9, damp: 0.3, mix: 0.4 })
  .gain(0.15)
  .out()

// laser zaps
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

/** (j) Grieg's "Hall of the Mountain King": a fugue that speeds itself into a club drop, then winds down. */
const mountainKingFugue = `// clock: its tempo is patched from its own position
const span = (s, lo, hi) => s.lt(hi).add(s.lt(lo).mul(-1))
const clk = loop((pos) => {
  const x = pos.div(24).clip(0, 1)
  const accel = x.mul(x).mul(156).add(100)
  const windDown = pos.add(-62).mul(-98).add(128)
  return clock(accel.mul(pos.lt(24))
    .add(span(pos, 24, 62).mul(128))
    .add(span(pos, 62, 63).mul(windDown))
    .add(span(pos, 63, 64).mul(128)))
})
const ramp = (lo, hi) => clk.add(-lo).div(hi - lo).clip(0, 1).mul(span(clk, lo, hi))
const swell = clk.div(24).clip(0, 1).mul(0.6).add(0.4)
const dive = ramp(62, 63).mul(-12)

// subject and countersubject
const theme = [
  p\`b3 c#4 d4 e4 f#4 d4 f#4@2\`,
  p\`f4 c#4 f4@2 e4 c4 e4@2\`,
  p\`b3 c#4 d4 e4 f#4 d4 f#4 b4\`,
  p\`a4 f#4 d4 f#4 a4@4\`,
]
const countersubject = [
  p\`b2 ~ f#3 ~ b2 ~ f#3 ~\`,
  p\`c#3 ~ g#3 ~ c3 ~ g3 ~\`,
  p\`b2 ~ f#3 ~ b2 ~ f#3 ~\`,
  p\`d3 ~ a3 ~ d3 ~ a3 ~\`,
]
const up = (bars, n) => bars.map((bar) => bar.add(n))
const times = (n, bar) => Array(n).fill(bar)
const rest = (n) => times(n, p\`~\`)
const part = (...blocks) => {
  const bars = blocks.flat(Infinity)
  return seq(p\`\${bars}\`.slow(bars.length), clk)
}
const drum = (...blocks) => part(...blocks).trig

// drop material: the theme in 16ths, its harmony, and the drums
const dropTheme = up([p\`\${theme[0]} \${theme[1]}\`, p\`\${theme[2]} \${theme[3]}\`], 12)
const roots = [p\`~ b1 ~ b1 ~ c#2 ~ c2\`, p\`~ b1 ~ b1 ~ d2 ~ d2\`]
const chords = [
  p\`[b3,d4,f#4]@2 [c#4,f4,g#4] [c4,e4,g4]\`,
  p\`[b3,d4,f#4]@2 [d4,f#4,a4]@2\`,
]
const stabs = [
  p\`[b3,d4,f#4] ~ ~ [b3,d4,f#4] [c#4,f4,g#4] ~ [c4,e4,g4] ~\`,
  p\`[b3,d4,f#4] ~ ~ [b3,d4,f#4] [d4,f#4,a4] ~ [d4,f#4,a4] ~\`,
]
const arps = [
  p\`[b4 d5 f#5 d5]!2 [c#5 f5 g#5 f5] [c5 e5 g5 e5]\`,
  p\`[b4 d5 f#5 d5]!2 [d5 f#5 a5 f#5]!2\`,
]
const march = p\`60 ~ ~ ~ 60 ~ ~ ~\`
const backbeat = p\`~ ~ 60 ~ ~ ~ 60 ~\`
const floor = p\`60 60 60 60\`
const offbeat = p\`~ 60 ~ 60 ~ 60 ~ 60\`
const fill = p\`~ ~ 60 ~ [60 60] [60 60] [60*4] [60*4]\`
const landing = p\`~ ~ 60 ~ ~ ~ ~ ~\`

// fugue voices: exposition, stretto, tutti; alto and cello return in the last drop
const alto = part(
  theme, up(countersubject, 7), rest(4), theme, theme, theme.slice(0, 3), rest(1),
  rest(28), theme, theme,
  up(dropTheme, -12), up(dropTheme, -12)[0], p\`~ ~ d4 _ _ _ _ ~\`, rest(1))
const soprano = part(
  rest(4), up(theme, 19), up(countersubject, 24), rest(2), up(theme.slice(0, 2), 12), up(theme, 12),
  up(theme, 12), rest(41))
const cello = part(
  rest(8), up(theme, -12), countersubject, up(theme, -12), up(theme, -12).slice(0, 3),
  rest(29), countersubject, countersubject, rest(5))
const tenor = part(rest(16), up(countersubject, 12), up(countersubject, 12).slice(0, 3), rest(42))

// drop voices: drop 1, drop 2, breakdown, drop 3 in F#, drop 4, unison, wind-down, landing
const lead = part(
  rest(24), times(8, dropTheme), rest(4), times(4, up(dropTheme, 7)), times(4, dropTheme),
  dropTheme, dropTheme[0], p\`~ ~ b4 _ _ _ _ ~\`, rest(1))
const bassline = part(
  rest(24), times(8, roots), rest(4), times(4, up(roots, 7)), times(4, roots),
  up(dropTheme, -36), up(dropTheme, -36)[0], p\`~ ~ b1 _ _ _ _ ~\`, rest(1))
const pads = part(
  rest(24), times(8, chords), times(4, p\`[b2,f#3,b3]\`), times(4, up(chords, 7)), times(4, chords),
  rest(3), p\`~ ~ [b3,d4,f#4] _ _ _ _ ~\`, rest(1))
const horns = part(
  rest(32), times(4, stabs), theme, times(4, up(stabs, 7)), times(4, stabs),
  rest(3), p\`~ ~ [f#3,b3,d4] _ _ _ _ ~\`, rest(1))
const bells = part(
  rest(32), times(4, arps), rest(4), times(4, up(arps, 7)),
  rest(1), times(3, up(dropTheme, 12)), up(dropTheme, 12)[0],
  up(dropTheme, 12), up(dropTheme, 12)[0], p\`~ ~ b5 _ _ _ _ ~\`, rest(1))

// drums
const kickTrig = drum(rest(24), times(16, floor), rest(4), times(19, floor), landing, rest(1))
const impacts = drum(
  rest(24), p\`60\`, rest(7), p\`60\`, rest(11), p\`60\`, rest(7), p\`60\`, rest(7), p\`60\`, rest(2), landing, rest(1))
const pump = kickTrig.ad(0.002, 0.25).mul(-0.75).add(1)

drum(rest(8), times(8, march), times(6, p\`60 ~ 60 ~ 60 ~ 60 ~\`), rest(43))
  .kick({ pitch: 40, sweep: 3, decay: 0.3, click: 0.05 })
  .mul(swell)
  .gain(0.35)
  .out()

kickTrig
  .kick({ pitch: 45, sweep: 4, decay: 0.35, click: 0.3 })
  .gain(0.8)
  .out()

drum(
  rest(12), times(8, backbeat), times(2, p\`60*8\`), p\`60*16\`, p\`[60*8] [60*8] ~ ~\`,
  rest(7), fill, rest(7), fill, rest(2), p\`60*8\`, p\`60*16\`,
  rest(7), fill, rest(7), fill, p\`60*8\`, p\`60*16\`, rest(1), landing, rest(1))
  .snare()
  .mul(swell)
  .gain(0.22)
  .out()

drum(rest(28), times(12, p\`~ 60 ~ 60\`), rest(4), times(18, p\`~ 60 ~ 60\`), rest(3))
  .clap()
  .gain(0.28)
  .out()

drum(rest(16), times(6, p\`60*8\`), rest(10), times(8, p\`60*16\`), rest(4), times(18, p\`60*16\`), rest(3))
  .hihat()
  .gain(0.05)
  .out()

drum(rest(24), times(16, offbeat), rest(4), times(18, offbeat), rest(3))
  .hihat({ decay: 0.15, tone: 0.7 })
  .gain(0.1)
  .out()

impacts
  .hihat({ decay: 1.5, tone: 0.8, metal: 0.7 })
  .gain(0.15)
  .out()

const boom = impacts.ad(0.001, 1.5)
sin(boom.mul(30).add(26))
  .mul(boom)
  .gain(0.35)
  .out()

// effects: risers into the drop and the breakdown's drop, a downlifter into the breakdown
const hiss = noise()
const rise = ramp(20, 24).add(ramp(42, 44))
hiss.hpf(rise.mul(48).add(72), 0.3)
  .mul(rise)
  .gain(0.2)
  .out()

const fall = ramp(40, 41).mul(-1).add(1).mul(span(clk, 40, 41))
hiss.lpf(fall.mul(60).add(50), 0.2)
  .mul(fall)
  .gain(0.25)
  .out()

// sound: each voice goes out dry and into one shared hall reverb
const voice = (s, wave, cutoff, level) => s.add(dive)[wave]()
  .lpf(cutoff, 0.2)
  .mod("cutoff", swell, 18)
  .mul(s.gate.adsr(0.005, 0.1, 0.4, 0.06))
  .mul(swell)
  .gain(level)
const halfInDrop = (level) => span(clk, 52, 64).mul(-level / 2).add(level)
const altoSig = voice(alto, "sqr", 75, halfInDrop(0.24))
const sopranoSig = voice(soprano, "tri", 89, 0.27)
const celloSig = voice(cello, "saw", 63, halfInDrop(0.3))
const tenorSig = voice(tenor, "saw", 70, 0.2)
altoSig.pan(-0.3).out()
sopranoSig.pan(0.3).out()
celloSig.out()
tenorSig.pan(-0.1).out()

const detune = seq(p\`[-0.15, -0.05, 0.05, 0.15]\`, clk)
const leadSig = lead.add(dive).add(detune).saw()
  .lpf(92, 0.15)
  .mul(lead.gate.adsr(0.003, 0.1, 0.6, 0.06))
  .gain(0.11)
leadSig.spread(0.8).out()

const padPitch = pads.add(dive)
const padSig = padPitch.saw()
  .add(padPitch.add(0.1).saw())
  .lpf(68, 0.1)
  .mod("cutoff", clk.wrap(8).div(8), 24)
  .mul(pads.gate.adsr(0.05, 0.3, 0.8, 0.3))
  .mul(pump)
  .gain(0.085)
padSig.spread(0.7).out()

const hornPitch = horns.add(dive)
const hornSig = hornPitch.saw()
  .add(hornPitch.add(-0.08).saw())
  .lpf(58, 0.15)
  .mod("cutoff", horns.gate.adsr(0.04, 0.25, 0.5, 0.1), 36)
  .mul(horns.gate.adsr(0.02, 0.2, 0.8, 0.12))
  .mul(pump)
  .gain(0.08)
hornSig.spread(0.5).out()

const bellSig = bells.add(dive)
  .fm(1.8, 3.5)
  .mul(bells.gate.ad(0.001, 0.5))
  .gain(0.08)
bellSig.delay({ time: 0.352, feedback: 0.35, mix: 0.3 })
  .pan(0.35)
  .out()

bassline.add(dive).saw()
  .lpf(50, 0.3)
  .mod("cutoff", bassline.gate.ad(0.002, 0.15), 30)
  .mul(bassline.gate.adsr(0.002, 0.1, 0.7, 0.05))
  .mul(pump)
  .gain(0.3)
  .out()

mixer({
    alto: altoSig,
    soprano: sopranoSig,
    cello: celloSig,
    tenor: tenorSig,
    lead: leadSig.mix(),
    pads: padSig.mix(),
    horns: hornSig.mix(),
    bells: bellSig})
  .reverb({ room: 0.88, damp: 0.4, mix: 1 })
  .gain(0.12)
  .out()
`;

export const EXAMPLES: readonly Example[] = [
	{ name: "smoke signal (a track)", source: smokeSignal },
	{ name: "coastline (after eddyflux)", source: coastline },
	{ name: "mirror canon (D dorian)", source: mirrorCanon },
	{ name: "mountain king (fugue into a drop)", source: mountainKingFugue },
	{ name: "chaconne (evolving form)", source: chaconne },
	{ name: "pocket rocket (dance)", source: pocketRocket },
	{ name: "first sound", source: firstSound },
	{ name: "patterns as values", source: patternsAsValues },
	{ name: "pattern as signal", source: patternAsSignal },
	{ name: "karplus pluck (loop)", source: karplus },
	{ name: "cross FM (loop record)", source: crossFm },
	{ name: "synced echo (beats)", source: syncedEcho },
	{ name: "write a module (defmod)", source: liveModule },
	{ name: "sub-patch module (defmod patch)", source: subpatch },
	{ name: "poly chords", source: polyChords },
	{ name: "wide saws (detune + spread)", source: wideSaws },
	{ name: "drums + counter", source: drums },
	{ name: "seeded chance", source: seededChance },
	{ name: "named mixer", source: namedMixer },
	{ name: "signal splicing", source: signalSplice },
	{ name: "pattern records", source: patternRecords },
	{ name: "live controls", source: liveControls },
];

/** The patch shown when the editor first loads. */
export const DEFAULT_EXAMPLE = smokeSignal;
