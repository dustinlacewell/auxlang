// adsr - modulated decay
// Decay time varies 0.05s to 0.5s
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr({
        attack: 0.01,
        decay: sin(0.15, 0.05, 0.5),
        sustain: 0.3,
        release: 0.3
      }))
      .out()
  )
