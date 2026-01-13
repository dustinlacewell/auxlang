// delay - modulated tone
// Tone varies 0.1 to 0.9 - dark to bright feedback
clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay({
        time: 0.25,
        feedback: 0.55,
        mix: 0.5,
        tone: sin(0.15, 0.1, 0.9)})
      .out())
