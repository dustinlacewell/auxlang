// slew - modulated fall
// Varying fall time
clock(120)
  .seq("c5 g4 e4 c4")
  .apply(s =>
    s.cv
      .slew({ rise: 0.01, fall: lfo(0.25, 0.01, 0.3) })
      .saw()
      .out())
