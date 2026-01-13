// adsr - defaults
// Pad sound - gate held for full beat, hear sustain phase
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.adsr())
      .out()
  )
