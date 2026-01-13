// ar - defaults
// Gate-controlled - holds at full volume while gate is on
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ar())
      .out())
