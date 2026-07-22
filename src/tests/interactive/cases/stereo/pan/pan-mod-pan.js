// pan - modulated pan
// Pan sweeps L to R
clock(90)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .pan({ pan: lfo(0.3, -1, 1) })
      .out())
