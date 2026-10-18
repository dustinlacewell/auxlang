// tape - modulated wow
// Wow varies 0.1 to 1 - the repeats drift slowly off pitch, then seasick
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1200))
      .gain(s.gate.ad(0.005, 0.15))
      .tape({ wow: lfo(0.2, 0.1, 1), flutter: 0.15, feedback: 0.5 })
      .out())
