// tape - modulated flutter
// Flutter depth varies 0.05 to 0.5 - fast wobble intensity
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({ wow: 0.15, flutter: lfo(0.2, 0.05, 0.5), feedback: 0.5 })
      .out())
