// Tie Showcase
// Expressive legato melody
clock(100)
  .seq("c4_e4_g4 ~ c5_b4 g4_e4 ~ c4")
  .sin()
  .gain(0.4)
  .delay({ time: 0.25, feedback: 0.35, mix: 0.3 })
  .out()
