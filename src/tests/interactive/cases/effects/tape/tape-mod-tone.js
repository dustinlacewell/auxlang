// tape - modulated tone
// Tone varies 0.2 to 0.9 - dark to bright feedback
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({ tone: lfo(0.15, 0.2, 0.9), feedback: 0.5 })
      .out())
