// tri - showcase
// Soft pad with triangle wave
clock(60)
  .seq("[c4,e4,g4]")
  .apply(s =>
    s
      .tri()
      .lpf(hz(800))
      .gain(s.gate.adsr({ attack: 0.3, release: 0.5 }))
      .out())
