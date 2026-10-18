// saw - showcase
// Sequenced saw with envelope
clock(120)
  .seq("c3 e3 g3 c4")
  .apply(s =>
    s
      .saw()
      .gain(s.gate.adsr())
      .out())
