// ad - showcase
// Plucky bass with filter envelope
clock(120)
  .seq("c2 ~ g2 ~ e2 ~ g2 ~")
  .apply(s =>
    s.saw()
      .lpf(
        s
          .gate
          .ad({ attack: 0.01, decay: 0.2 })
          .scale(200, 2500))
      .gain(s.gate.ad({ attack: 0.005, decay: 0.25 }))
      .out())
