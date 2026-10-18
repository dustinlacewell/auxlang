// clock - modulated bpm
// Accelerating tempo
clock({ bpm: lfo(0.1, 80, 160) })
  .seq("c4 e4")
  .apply(s =>
    s.saw()
      .gain(s.gate.ar())
      .out())
