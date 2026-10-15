// Slide Three
// One attack per bar, then the pitch steps up c4, e4, g4 with no new attack
clock(120)
  .seq("c4_e4_g4")
  .apply(s => s
    .sin()
    .vca(s.gate.ar(0.005, 0.1))
    .gain(0.5)
    .out())
