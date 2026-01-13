// delay - showcase
// Melodic sequence with rhythmic dub delay
clock(120)
  .seq("c4 e4 g4 ~ c5 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(2000)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .delay({
        time: 0.25,
        feedback: 0.5,
        mix: 0.4,
        tone: 0.4})
      .out())
