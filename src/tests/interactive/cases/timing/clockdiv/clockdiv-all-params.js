// clockDiv - all params
// High arp with low bass (div by 2)
clock(240)
  .apply(c =>
    mix({
      a: c
        .seq("c5 e5")
        .apply(s =>
          s.cv
            .tri()
            .gain({ level: s.gate.ar() })),
      b: clockDiv(c)
        .by(2)
        .seq("c3")
        .apply(s =>
          s.cv
            .sin()
            .gain({ level: s.gate.ar({ release: 0.2 }) }))}).out())
