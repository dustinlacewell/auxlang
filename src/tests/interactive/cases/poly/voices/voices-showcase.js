// voices - showcase
// Sub bass + pad + arp from single pattern
let s = clock(100).seq("{c2,c3 g3,c4 e4 g4 b4}")
s.voices[0].apply(v =>
  v.sin()
    .gain({ level: v.gate.ar({ attack: 0.02, release: 0.4 }) })
    .gain(0.5)
    .out()
)
s.voices[1].apply(v =>
  v.tri()
    .lpf(600)
    .gain({ level: v.gate.adsr({ attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.5 }) })
    .gain(0.25)
    .out()
)
s.voices[2].apply(v =>
  v.saw()
    .lpf(sin(0.3, 800, 2000))
    .gain({ level: v.gate.ar({ attack: 0.01, release: 0.1 }) })
    .delay({ time: 0.125, feedback: 0.4, mix: 0.3 })
    .gain(0.2)
    .out()
)
