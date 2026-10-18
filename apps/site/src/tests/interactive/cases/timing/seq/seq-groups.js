// seq - groups
// Grouped subdivisions with []
clock(120)
  .seq("[c4 e4] [g4 c5] e4 c4")
  .apply(s =>
    s.tri()
      .gain(s.gate.ar())
      .out())
