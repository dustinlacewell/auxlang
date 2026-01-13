// ar - all params
// Slow attack, medium release
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ar({ attack: 0.2, release: 0.3 }))
      .out()
  )
