// snare - modulated tone
// Snare body/noise balance sweep
clock(120)
  .seq("~ c4 ~ c4")
  .apply(s =>
    s.trig
      .snare({ tone: lfo(0.5, 0.1, 0.7) })
      .out())
