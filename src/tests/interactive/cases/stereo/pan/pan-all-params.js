// pan - all params
// Hard panned right
clock(90)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .pan({ pan: 1 })
      .out())
