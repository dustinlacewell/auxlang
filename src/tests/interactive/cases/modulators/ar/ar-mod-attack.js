// ar - modulated attack
// Attack time varies 0.01s to 0.5s
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .ar({ attack: sin(0.15, 0.01, 0.5), release: 0.2 }))
      .out())
