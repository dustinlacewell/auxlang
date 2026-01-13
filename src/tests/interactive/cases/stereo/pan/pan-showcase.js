// pan - showcase
// Ping-pong delay with alternating pan
clock(120)
  .seq("c4 ~ e4 ~ g4 ~ c5 ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.1 }))
      .pan({ pan: sin(0.5, -0.8, 0.8) })
      .delay({ time: 0.15, feedback: 0.4, mix: 0.35 })
      .out())
