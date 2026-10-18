// seq - poly
// Polyphonic chord pattern
clock(60)
  .seq("[c4,e4,g4]")
  .apply(s =>
    s.tri()
      .gain(s.gate.adsr())
      .out())
