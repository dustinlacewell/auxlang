// seq - rests
// Sequence with rests
clock(120)
  .seq("c4 ~ e4 ~")
  .apply(s =>
    s.cv
      .tri()
      .gain({ level: s.gate.ar() })
      .out())
