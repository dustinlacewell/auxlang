// clockMult - modulated by
// Varying multiplication factor
clock(60)
  .apply(c =>
    clockMult(c).by(sin(0.1, 1, 4))
      .seq("c4")
      .gate
      .hihat()
      .out())
