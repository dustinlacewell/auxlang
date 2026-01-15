// Multiple Rests
// Long silence between notes
clock(120)
  .seq("c4 ~ ~ ~ e4 ~ ~ ~")
  .sin()
  .gain(0.5)
  .out()
