// clockMult - defaults
// Multiply clock by 2
clock(60)
  .apply(c =>
    clockMult(c).seq("c4 e4")
      .apply(s =>
        s.cv
          .saw()
          .gain({ level: s.gate.ar() })
          .out()))
