// clockdiv - modulated by
// An LFO walks the division 2 to 6: the low note thins out and fills back in
const c = clock(240)
sin(84)
  .mul(c.beat.ad(0.005, 0.08))
  .gain(0.2)
  .out()
sin(48)
  .mul(c.beat.clockdiv(lfo(0.1, 2, 6)).ad(0.005, 0.2))
  .gain(0.4)
  .out()
