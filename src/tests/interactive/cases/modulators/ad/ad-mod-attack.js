// ad - modulated attack
// Attack time varies 0.001s to 0.1s
clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .ad({ attack: sin(0.2, 0.001, 0.1), decay: 0.15 }))
      .out())
