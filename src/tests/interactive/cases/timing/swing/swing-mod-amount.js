// swing - modulated amount
// Swing varies from straight to heavy shuffle
clock(120)
  .swing(sin(0.2, 0, 0.4))
  .seq("c4 e4 g4 e4")
  .apply(s =>
    s.saw()
      .gain(s.gate.ar())
      .out())
