// tape - modulated mix
// Mix varies 0.1 to 0.8 - dry to wet sweep
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({ time: 0.3, feedback: 0.45, mix: sin(0.2, 0.1, 0.8) })
      .out())
