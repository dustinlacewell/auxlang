// Octave Range
// Same note across different octaves
clock(120)
  .seq("c2 c3 c4 c5")
  .sin()
  .gain(0.5)
  .out()
