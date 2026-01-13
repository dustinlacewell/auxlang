// reverb - modulated damp
// Damping varies 0.1 to 0.9 - bright to dark
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb({ room: 0.75, damp: sin(0.15, 0.1, 0.9), mix: 0.5 })
      .out())
