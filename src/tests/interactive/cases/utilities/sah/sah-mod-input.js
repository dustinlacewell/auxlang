// sah - modulated input
// Sample complex modulation
clock(120)
  .seq("c4*4")
  .apply(s =>
    sah({
      input: lfo(7)
        .scale({
          from: -1,
          to: 1,
          min: 200,
          max: 600}),
      trig: s.trig}).tri()
      .gain({ level: s.gate.ar() })
      .out())
