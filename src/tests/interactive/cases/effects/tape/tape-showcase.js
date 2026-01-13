// tape - showcase
// Lo-fi dub bass with degraded tape
clock(75)
  .seq("c2 ~ ~ ~ g2 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(600)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.25 }))
      .tape({
        time: 0.4,
        feedback: 0.55,
        saturation: 0.5,
        tone: 0.35,
        wow: 0.4,
        flutter: 0.2})
      .out())
