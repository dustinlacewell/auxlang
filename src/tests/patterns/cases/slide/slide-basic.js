// Slide Basic
// Two attacks per bar: e4 and c5 change pitch with no new attack
clock(120)
  .seq("c4_e4 g4_c5")
  .apply(s => s
    .sin()
    .vca(s.gate.ar(0.005, 0.1))
    .gain(0.5)
    .out())
