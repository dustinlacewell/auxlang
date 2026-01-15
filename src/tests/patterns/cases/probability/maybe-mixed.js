// Maybe Mixed Probabilities
// Different probabilities per note
clock(120)
  .seq("c4?.9 e4?.5 g4?.25 c5?.75")
  .sin()
  .gain(0.5)
  .out()
