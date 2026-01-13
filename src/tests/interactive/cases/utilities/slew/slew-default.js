// slew - defaults
// Portamento on sequencer
clock(120)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.cv
      .slew()
      .saw()
      .out())
