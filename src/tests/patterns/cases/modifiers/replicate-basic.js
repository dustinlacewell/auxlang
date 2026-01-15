// Replicate Basic
// Note repeated 4x, each gets full beat
clock(120)
  .seq("c4!4")
  .sin()
  .gain(0.5)
  .out()
