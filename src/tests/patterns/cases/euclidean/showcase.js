// Euclidean Showcase
// Layered polyrhythmic pattern
clock(110)
  .seq("c3(3,8) e4(5,8) g4(7,16)")
  .sin()
  .gain(0.35)
  .delay({ time: 0.15, feedback: 0.45, mix: 0.3 })
  .out()
