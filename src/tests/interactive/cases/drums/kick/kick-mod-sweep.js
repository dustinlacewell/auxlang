// kick - modulated sweep
// Kick with varying pitch sweep
clock(120)
  .seq("c4 c4 c4 c4")
  .apply(s =>
    s.trig
      .kick({ sweep: lfo(0.25, 2, 8) })
      .out())
