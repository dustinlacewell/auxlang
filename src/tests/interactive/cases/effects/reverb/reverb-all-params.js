// reverb - all params
// All params specified - large dark hall
clock(60)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .reverb({ room: 0.9, damp: 0.7, mix: 0.55 })
      .out())
