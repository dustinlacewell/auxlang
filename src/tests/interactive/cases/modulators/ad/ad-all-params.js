// ad - all params
// Fast attack, medium decay
clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.2 }))
      .out())
