// tape - modulated feedback
// Feedback varies 0.2 to 0.7
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        time: 0.25,
        feedback: sin(0.15, 0.2, 0.7)
      })
      .out()
  )
