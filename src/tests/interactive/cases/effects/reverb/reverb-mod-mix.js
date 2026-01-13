// reverb - modulated mix
// Mix varies 0.1 to 0.8 - dry to wet sweep
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb({
        room: 0.7,
        mix: sin(0.2, 0.1, 0.8)
      })
      .out()
  )
