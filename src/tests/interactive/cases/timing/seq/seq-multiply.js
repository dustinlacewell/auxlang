// seq - multiply
// Subdivided notes with * (4 fast, 2 medium, 1 slow)
clock(60)
  .seq("c4*4 e4*2 g4")
  .apply(s =>
    s.cv
      .tri()
      .gain({ level: s.gate.ar({ attack: 0.01, release: 0.05 }) })
      .out())
