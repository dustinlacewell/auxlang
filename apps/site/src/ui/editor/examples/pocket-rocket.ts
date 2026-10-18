import type { Example } from "@/ui/editor/examples/example";

/** A dance track arranged from section patterns. */
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

export const pocketRocketExample: Example = { name: "pocket rocket", source: pocketRocket };
