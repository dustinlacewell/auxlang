// clock - all params
// Slow tempo in 3/4
clock({ bpm: 80, beatsPerBar: 3 })
  .seq("c4 e4 g4 e4")
  .apply(s =>
    s.saw()
      .gain(s.gate.ar())
      .out())
