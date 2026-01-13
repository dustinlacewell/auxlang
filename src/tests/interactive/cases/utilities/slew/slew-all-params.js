// slew - all params
// Asymmetric slew (fast up, slow down)
clock(120)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.cv
      .slew({ rise: 0.01, fall: 0.3 })
      .saw()
      .out())
