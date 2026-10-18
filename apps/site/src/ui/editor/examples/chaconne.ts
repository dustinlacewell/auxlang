import type { Example } from "@/ui/editor/examples/example";

/** A chaconne that grows along one energy curve. */
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

export const chaconneExample: Example = { name: "chaconne", source: chaconne };
