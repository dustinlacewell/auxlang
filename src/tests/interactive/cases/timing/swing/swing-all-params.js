// swing - all params
// Noticeable shuffle feel at 0.2
clock(120)
  .swing(0.2)
  .seq("c4 e4 g4 e4")
  .apply(s =>
    s.saw()
      .gain(s.gate.ar())
      .out())
