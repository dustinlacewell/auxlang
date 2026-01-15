// Multiply Basic
// Note repeated 4x within one beat
clock(60)
  .seq("c4*4")
  .sin()
  .gain(0.5)
  .out()
