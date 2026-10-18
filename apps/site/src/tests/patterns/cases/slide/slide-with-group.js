// Slide With Group
// Two attacks per bar: c4 slides to e4 inside the group, then g4 attacks
clock(60)
  .seq("[c4_e4 g4]")
  .apply(s => s
    .sin()
    .vca(s.gate.ar(0.005, 0.1))
    .gain(0.5)
    .out())
