// Note Sequence
// Four different notes in order
clock(120)
  .seq("c4 e4 g4 b4")
  .sin()
  .gain(0.5)
  .out()
