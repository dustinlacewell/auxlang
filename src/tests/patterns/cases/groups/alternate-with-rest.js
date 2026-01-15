// Alternate With Rest
// Alternates between note and rest
clock(120)
  .seq("<c4 ~> <e4 ~>")
  .sin()
  .gain(0.5)
  .out()
