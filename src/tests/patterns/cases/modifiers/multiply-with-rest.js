// Multiply With Rest
// Multiplied note followed by rest
clock(60)
  .seq("c4*4 ~ e4*4 ~")
  .sin()
  .gain(0.5)
  .out()
