// ar - showcase
// Chord with slow attack, filter follows amplitude
clock(45)
  .seq("{c4,e4,g4} ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(
        s
          .gate
          .ar({ attack: 0.5, release: 0.8 })
          .scale(400, 2000))
      .gain(s.gate.ar({ attack: 0.5, release: 0.8 }))
      .out())
