// tape - modulated time
// Delay time varies 0.1s to 0.4s - pitch shifts
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        time: sin(0.2, 0.1, 0.4),
        feedback: 0.45,
        wow: 0.1,
        flutter: 0.1
      })
      .out()
  )
