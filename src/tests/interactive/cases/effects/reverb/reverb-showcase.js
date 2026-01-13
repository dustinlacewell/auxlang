// reverb - showcase
// Ambient chord stabs with lush reverb
clock(60)
  .seq("{c4,e4,g4} ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1800)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.2 }))
      .reverb({ room: 0.85, damp: 0.4, mix: 0.55 })
      .out())
