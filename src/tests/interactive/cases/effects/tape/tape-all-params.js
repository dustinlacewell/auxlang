// tape - all params
// All params specified - vintage degraded tape
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .tape({
        time: 0.35,
        feedback: 0.5,
        mix: 0.5,
        wow: 0.5,
        flutter: 0.3,
        saturation: 0.5,
        tone: 0.4,
        age: 0.3
      })
      .out()
  )
