// tape - modulated age
// Age varies 0 to 0.6 - tape wear/noise
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({ age: sin(0.15, 0, 0.6), feedback: 0.45 })
      .out())
