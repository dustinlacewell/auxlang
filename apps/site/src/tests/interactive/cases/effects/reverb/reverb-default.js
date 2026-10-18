// reverb - defaults
// Plucky hit with default reverb
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb()
      .out())
