// Multiply vs Replicate
// Compare: multiply fits in 1 beat, replicate adds beats
clock(60)
  .seq("c4*4 e4!4")
  .sin()
  .gain(0.5)
  .out()
