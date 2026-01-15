// Tie Basic
// Two notes tied together (legato, no re-trigger)
clock(120)
  .seq("c4_e4 g4_c5")
  .sin()
  .gain(0.5)
  .out()
