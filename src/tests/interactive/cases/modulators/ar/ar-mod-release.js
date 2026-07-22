// ar - modulated release
// Release time varies 0.05s to 0.6s
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .ar({ attack: 0.01, release: lfo(0.15, 0.05, 0.6) }))
      .out())
