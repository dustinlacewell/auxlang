// tape - modulated flutter
// Flutter varies 0.05 to 1 - the repeats go from steady to a fast, uneven warble
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1200))
      .gain(s.gate.ad(0.005, 0.15))
      .tape({ wow: 0.1, flutter: lfo(0.2, 0.05, 1), feedback: 0.5 })
      .out())
