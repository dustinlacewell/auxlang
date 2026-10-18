// mult - showcase
// Classic ring modulation
clock(120)
  .seq("c3 e3 g3 c4")
  .apply(s =>
    s
      .saw()
      .mul(sin(hz(200)))
      .lpf(hz(2000))
      .gain(s.gate.adsr())
      .out())
