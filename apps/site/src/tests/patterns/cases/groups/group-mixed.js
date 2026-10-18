// Group Mixed
// Groups alternating with single notes
clock(60)
  .seq("c4 [e4 g4] c5 [b4 g4]")
  .sin()
  .gain(0.5)
  .out()
