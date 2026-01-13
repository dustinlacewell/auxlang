// spread - all params
// Narrow width - voices closer to center
clock(60)
  .seq("{c4,e4,g4}")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
      .spread({ width: 0.3 })
      .out()
  )
