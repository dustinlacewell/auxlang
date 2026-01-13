// snare - modulated decay
// Snare with varying decay
clock(120)
  .seq("~ c4 ~ c4")
  .apply(s =>
    s.trig
      .snare({ decay: sin(0.25, 0.08, 0.25) })
      .out())
