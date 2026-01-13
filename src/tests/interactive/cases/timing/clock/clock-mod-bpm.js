// clock - modulated bpm
// Accelerating tempo
clock({ bpm: sin(0.1, 80, 160) })
  .seq("c4 e4")
  .apply(s =>
    s.cv
      .saw()
      .gain({ level: s.gate.ar() })
      .out())
