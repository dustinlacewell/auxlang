// Euclidean Showcase
// Layered polyrhythmic pattern
clock(50)
  .seq("c3(3,8) e4(5,8) g4(7,16)")
  .apply(s=>s
  .sin()
  .vca(s.gate, 0.01, 0.01)
  .gain(0.85)
  .out())
