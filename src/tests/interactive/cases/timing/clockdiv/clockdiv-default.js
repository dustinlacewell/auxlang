// clockDiv - defaults
// Fast notes with slow kick (div by 4)
clock(240)
  .apply(c =>
    mix({
      a: c
        .seq("c5 e5 g5 c6")
        .apply(s =>
          s.cv
            .tri()
            .gain({ level: s.gate.ar() })),
      b: clockDiv(c)
        .seq("c3")
        .apply(s =>
          s.cv
            .sin()
            .gain({ level: s.gate.ar({ release: 0.3 }) }))}).out())
