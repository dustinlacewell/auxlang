// Euclidean On Stack
// Euclidean rhythm applied to a chord
clock(120)
  .seq("{c4,e4,g4}(3,8)")
  .apply(s=>s
  .sin()
  .vca(s.gate)
  .gain(0.4)
  .out())
