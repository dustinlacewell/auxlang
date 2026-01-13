// gain - showcase
// Envelope-controlled amplitude
clock(120)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.cv
      .saw()
      .gain({ level: s.gate.adsr() })
      .out())
