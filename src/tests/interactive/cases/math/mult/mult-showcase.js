// mult - showcase
// Classic ring modulation
clock(120)
  .seq("c3 e3 g3 c4")
  .apply(s =>
    s.cv
      .saw()
      .mult(sin(200))
      .lpf({ cutoff: 2000 })
      .gain({ level: s.gate.adsr() })
      .out())
