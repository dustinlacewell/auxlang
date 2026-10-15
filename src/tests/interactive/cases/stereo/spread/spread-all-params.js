// spread - all params
// Narrow spread at 0.3: the three chord notes sit close to the center
clock(60)
  .seq("[c4,e4,g4]")
  .apply(s =>
    s.saw()
      .lpf(hz(1500))
      .gain(s.gate.ad(0.01, 0.3))
      .spread(0.3)
      .out())
