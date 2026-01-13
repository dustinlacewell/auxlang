// noise - showcase
// Filtered noise burst on triggers
clock(120)
  .seq("c4 ~ c4 c4")
  .apply(s =>
    noise().lpf({ cutoff: 2000 })
      .gain({ level: s.gate.ar({ attack: 0.01, release: 0.1 }) })
      .out())
