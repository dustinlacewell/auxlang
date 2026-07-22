// hihat - modulated metal
// Metallic to noisy transition
clock(120)
  .seq("c4*4")
  .apply(s =>
    s.trig
      .hihat({ metal: lfo(0.5, 0.2, 0.9) })
      .out())
