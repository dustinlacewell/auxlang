// reverb - modulated room
// Room size varies 0.3 to 0.95
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1200)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.12 }))
      .reverb({
        room: sin(0.1, 0.3, 0.95),
        mix: 0.5
      })
      .out()
  )
