// clap - modulated decay
// Clap with varying tail length
clock(120)
  .seq("~ c4 ~ c4")
  .apply(s =>
    s.trig
      .clap({ decay: lfo(0.25, 0.1, 0.4) })
      .out())
