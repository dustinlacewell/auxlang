// sah - modulated input
// Sample complex modulation
clock(120)
  .seq("c4*4")
  .apply(s =>
    lfo(7)
      .scale({
        from: -1,
        to: 1,
        min: 48,
        max: 67})
      .sah(s.trig)
      .tri()
      .gain(s.gate.ar())
      .out())
