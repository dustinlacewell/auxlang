// spread - modulated amount
// An LFO sweeps the spread 0.1 to 1: the chord opens from near-mono to full width and back
clock(60)
  .seq("[c4,e4,g4]")
  .apply(s =>
    s.saw()
      .lpf(hz(1500))
      .gain(s.gate.ad(0.01, 0.3))
      .spread(lfo(0.2, 0.1, 1))
      .out())
