// Slide With Rest
// Two attacks per bar, each gliding up into its slid note; silence in the rests
clock(120)
  .seq("c4_e4 ~ g4_c5 ~")
  .apply(s => s
    .slew(s.slide.mul(0.02), 0)
    .sin()
    .vca(s.gate)
    .gain(0.5)
    .out())
