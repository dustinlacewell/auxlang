// spread - defaults
// A 3-note chord spread wide: C hard left, E center, G hard right
clock(60)
  .seq("[c4,e4,g4]")
  .apply(s =>
    s.saw()
      .lpf(hz(1500))
      .gain(s.gate.ad(0.01, 0.3))
      .spread()
      .out())
