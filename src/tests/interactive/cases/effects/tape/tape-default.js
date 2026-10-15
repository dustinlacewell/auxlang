// tape - defaults
// Plucky hit with a mild, warm tape echo that wobbles slightly
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1500))
      .gain(s.gate.ad(0.005, 0.15))
      .tape()
      .out())
