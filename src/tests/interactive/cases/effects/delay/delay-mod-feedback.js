// delay - modulated feedback
// Feedback varies 0.3 to 0.75
clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay({ time: 0.2, feedback: sin(0.15, 0.3, 0.75), mix: 0.5 })
      .out())
