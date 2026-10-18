// seq - rests
// Sequence with rests
clock(120)
  .seq("c4 ~ e4 ~")
  .apply(s =>
    s.tri()
      .gain(s.gate.ar())
      .out())
