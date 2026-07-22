// clap - modulated tone
// Clap brightness sweep
clock(120)
  .seq("~ c4 ~ c4")
  .apply(s =>
    s.trig
      .clap({ tone: lfo(0.5, 0.2, 0.8) })
      .out())
