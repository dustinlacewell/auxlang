// clockMult - all params
// Multiply clock by 4
clock(60)
  .apply(c =>
    clockMult(c).by(4)
      .seq("c4 e4 g4 c5")
      .apply(s =>
        s.cv
          .saw()
          .gain({ level: s.gate.ar() })
          .out()))
