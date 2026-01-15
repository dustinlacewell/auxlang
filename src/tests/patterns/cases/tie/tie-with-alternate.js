// Tie With Alternate
// Alternation using tied patterns
clock(120)
  .seq("<c4_e4 e4_g4>")
  .apply(s=>s
  .sin()
  .vca(s.gate)
  .gain(0.5)
  .out())
