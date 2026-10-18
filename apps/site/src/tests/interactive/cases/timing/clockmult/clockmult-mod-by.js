// clockmult - modulated by
// An LFO walks the multiplier 1 to 4: the hats speed up and slow down in whole steps
const c = clock(60)
c.beat
  .clockmult(lfo(0.1, 1, 4))
  .hihat()
  .gain(3)
  .out()
