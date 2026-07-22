// snare - modulated snappy
// Snare wire brightness sweep
clock(120)
  .seq("~ c4 ~ c4")
  .apply(s =>
    s.trig
      .snare({ snappy: lfo(0.5, 0.3, 0.95) })
      .out())
