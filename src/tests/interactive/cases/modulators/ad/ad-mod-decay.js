// ad - modulated decay
// Decay time varies 0.05s to 0.4s
clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .ad({ attack: 0.005, decay: sin(0.2, 0.05, 0.4) }))
      .out())
