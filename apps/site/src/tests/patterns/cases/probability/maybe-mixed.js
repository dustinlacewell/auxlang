// Maybe Mixed Probabilities
// Different probabilities per note
clock(120)
  .seq("c4?0.1 e4?0.5 g4?0.75 c5?0.25")
  .sin()
  .gain(0.5)
  .out()
