// Tie vs Sequence
// Compare tied notes vs separate notes
clock(120)
  .seq("c4_e4_g4 c4 e4 g4")
  .apply(s=>s
  .sin()
  .vca(s.gate, 0.01, 0.01, 0.01)
  .gain(0.5)
  .out())
