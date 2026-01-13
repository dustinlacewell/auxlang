// slew - showcase
// Glide bass line
clock(120)
  .seq("c2 c2 eb2 g2")
  .apply(s =>
    s.cv
      .slew({ rise: 0.05, fall: 0.05 })
      .saw()
      .lpf({ cutoff: 500 })
      .out())
