// tape - modulated saturation
// Saturation varies 0.1 to 0.8 - clean to driven
clock(90)
  .seq("c3 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(800)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.2 }))
      .tape({
        saturation: lfo(0.15, 0.1, 0.8),
        feedback: 0.45,
        mix: 0.55})
      .out())
