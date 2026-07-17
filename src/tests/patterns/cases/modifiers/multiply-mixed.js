// Multiply Mixed
// Different multiply values in sequence
clock(60)
  .seq("c4*2 e4*4 g4*3")
  .apply(s=>s
  .sin()
  .vca(s.gate))
  .gain(0.5)
  .out()
