// seq - defaults
// Simple 4-note sequence
clock(120)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.tri()
      .gain(s.gate.ar())
      .out())
