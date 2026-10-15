// tape - modulated time
// Delay time varies 0.1s to 0.4s - the repeats bend in pitch as the head moves
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1200))
      .gain(s.gate.ad(0.005, 0.15))
      .tape({
        time: lfo(0.2, 0.1, 0.4),
        feedback: 0.45,
        wow: 0.1,
        flutter: 0.1})
      .out())
