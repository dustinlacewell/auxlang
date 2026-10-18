import type { Example } from "@/ui/editor/examples/example";

/** A house track in F minor with live controls. */
const fMinorHouse = `tempo(126)

// kick
const beat = seq("60*4").trig.mul(toggle(1))
beat.kick({ pitch: 41, sweep: 4, decay: 0.4, click: 0.1 }).gain(0.9).out()
const pump = beat.ad(0.002, 0.3).from(1)

// clap
seq(p\`~ 60\`.fast(2)).trig.clap({ decay: 0.25 }).reverb({ room: 0.7, mix: 0.25 }).gain(0.6).out()
seq(p\`60*4\`.late(1 / 8)).trig.hihat({ decay: 0.08, metal: 0.3 }).gain(0.6).pan(0.25).out()
seq("60*16").trig.mul(button()).snare({ decay: 0.08 }).gain(0.4).out()

// ticks
const hat = seq(p\`60*16\`
  .with({ vel: p\`0.3 0.5 1 0.5\`.fast(4) })
  .swing(8))
hat.trig
  .hihat({ decay: p\`0.02 0.02 0.06 0.02\`.fast(4) })
  .mul(hat.vel)
  .gain(0.6)
  .pan(-0.25)
  .out()

// chords
const filter = xy(0.6, 0.2)
const chords = seq("<[f3,ab3,c4,eb4] [db3,f3,ab3,c4] [ab2,c3,eb3,g3] [eb3,g3,bb3,db4]>")
const stack = chords.add(p\`[-0.1, 0.1]\`)
  .saw()
  .lpf(filter.x.scale(70, 110, 0, 1), filter.y.scale(0, 0.7, 0, 1))
  .mul(chords.gate.adsr(0.01, 0.3, 0.8, 0.3))
  .mul(pump)
  .gain(0.05)
stack.spread().out()

// lead
const hook = seq(p\`<[c5 ~ ab4 c5 ~ f5 ~ eb5] [c5 ~ ab4 c5 ~ f5 ~ db5]
  [c5 ~ ab4 c5 ~ eb5 ~ c5] [bb4 ~ g4 bb4 ~ eb5 ~ db5]>\`)
const lead = hook.sqr()
  .lpf(hz(hook.gate.ad(0.002, 0.2).mul(3000).add(600)), 0.3)
  .mul(hook.gate.adsr(0.002, 0.2, 0.3, 0.1))
  .delay({ time: beats(0.75), feedback: 0.4, mix: 0.3 })
  .gain(0.08)
lead.out()

// reverb
stack.mix().add(lead).reverb({ room: 0.85, damp: 0.5, mix: 1 }).gain(0.4).out()

// bass
const root = seq("<f1 db1 ab0 eb1>")
const pluck = seq(p\`60*4\`.late(1 / 8)).gate
root.saw()
  .lpf(hz(pluck.ad(0.002, 0.15).mul(slider(1800, 200, 5000)).add(150)), 0.5)
  .mul(pluck.adsr(0.002, 0.15, 0.6, 0.05))
  .mul(pump)
  .gain(0.35)
  .scope(0.05)
  .out()`;

export const fMinorHouseExample: Example = { name: "f minor house", source: fMinorHouse };
