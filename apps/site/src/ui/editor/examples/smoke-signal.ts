import type { Example } from "@/ui/editor/examples/example";

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

export const smokeSignalExample: Example = { name: "smoke signal (a track)", source: smokeSignal };
