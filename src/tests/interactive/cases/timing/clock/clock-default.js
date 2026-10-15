// clock - defaults
// 120 BPM clock driving a sequence
clock()
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.saw()
      .gain(s.gate.ar())
      .out())
