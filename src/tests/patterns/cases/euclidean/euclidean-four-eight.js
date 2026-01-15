// Euclidean 4 of 8
// 4 evenly spaced hits (straight quarter notes)
clock(120)
  .seq("c4(4,8)")
  .sin()
  .gain(0.5)
  .out()
