// voices - showcase
// Sub bass + pad + arp from single pattern
s
  .voices
  .undefined
  .apply(v =>
    v.sin()
      .gain({ level: v.gate.ar({ attack: 0.02, release: 0.4 }) })
      .gain(0.5)
      .out())

s
  .voices
  .undefined
  .apply(v =>
    v.tri()
      .lpf(600)
      .gain({
        level: v
          .gate
          .adsr({
            attack: 0.1,
            decay: 0.2,
            sustain: 0.6,
            release: 0.5})})
      .gain(0.25)
      .out())

s
  .voices
  .undefined
  .apply(v =>
    v.saw()
      .lpf(sin(0.3, 800, 2000))
      .gain({ level: v.gate.ar({ attack: 0.01, release: 0.1 }) })
      .delay({ time: 0.125, feedback: 0.4, mix: 0.3 })
      .gain(0.2)
      .out())
