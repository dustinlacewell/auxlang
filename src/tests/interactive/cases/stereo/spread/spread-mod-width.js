// spread - modulated width
// Width sweeps narrow to wide
clock(60)
  .seq("{c4,e4,g4}")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
      .spread({ width: lfo(0.2, 0.1, 1) })
      .out())
