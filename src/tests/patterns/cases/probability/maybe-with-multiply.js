// Maybe With Multiply
// Probability on multiplied notes
clock(60)
  .seq("c4*4?.5 e4*4?.5")
  .sin()
  .gain(0.5)
  .out()
