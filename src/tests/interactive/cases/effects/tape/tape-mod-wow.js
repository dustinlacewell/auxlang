// tape - modulated wow
// Wow depth varies 0.1 to 0.7 - pitch drift intensity
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({ wow: sin(0.2, 0.1, 0.7), flutter: 0.15, feedback: 0.5 })
      .out())
