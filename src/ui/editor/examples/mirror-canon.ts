import type { Example } from "@/ui/editor/examples/example";

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

export const mirrorCanonExample: Example = { name: "mirror canon (D dorian)", source: mirrorCanon };
