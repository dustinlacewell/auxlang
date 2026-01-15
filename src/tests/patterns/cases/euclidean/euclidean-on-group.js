// Euclidean On Group
// Euclidean rhythm applied to a subdivided group
clock(12)
  .seq("[c4 e4](3,8)")
  .apply(s=>s
  .sin()
  .vca(s.gate)
  .gain(0.5)
  .out())
