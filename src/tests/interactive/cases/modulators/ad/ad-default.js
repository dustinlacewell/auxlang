// ad - defaults
// Plucky hit - envelope completes regardless of gate duration
clock(120)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad())
      .out())
