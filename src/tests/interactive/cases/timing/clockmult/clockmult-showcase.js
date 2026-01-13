// clockMult - showcase
// Fast arpeggio from slow clock
clock(30)
  .apply(c =>
    clockMult(c).by(8)
      .seq("c4 e4 g4 b4 c5 b4 g4 e4")
      .apply(s =>
        s.cv
          .tri()
          .gain({ level: s.gate.ar({ attack: 0.01, release: 0.05 }) })
          .out()))
