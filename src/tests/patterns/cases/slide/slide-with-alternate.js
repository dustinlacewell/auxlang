// Slide With Alternate
// One attack per bar; it slides c4 to e4, then e4 to g4 the next bar
clock(120)
  .seq("<c4_e4 e4_g4>")
  .apply(s => s
    .sin()
    .vca(s.gate.ar(0.005, 0.1))
    .gain(0.5)
    .out())
