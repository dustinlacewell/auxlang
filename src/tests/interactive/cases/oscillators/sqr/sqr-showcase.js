// sqr - showcase
// Classic 8-bit arpeggio
clock(240)
  .seq("c4 e4 g4 c5 g4 e4")
  .apply(s =>
    s.cv
      .sqr()
      .gain({ level: s.gate.ar({ attack: 0.01, release: 0.05 }) })
      .out())
