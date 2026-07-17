// swing - defaults
// No swing applied (amount 0)
clock(120)
  .swing()
  .seq("c4 e4 g4 e4")
  .apply(s =>
    s.saw()
      .gain(s.gate.ar())
      .out())
