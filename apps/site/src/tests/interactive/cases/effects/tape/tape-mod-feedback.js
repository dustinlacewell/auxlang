// tape - modulated feedback
// Feedback varies 0.2 to 0.7 - one slap, then a long trail of repeats
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1200))
      .gain(s.gate.ad(0.005, 0.15))
      .tape({ time: 0.25, feedback: lfo(0.15, 0.2, 0.7) })
      .out())
