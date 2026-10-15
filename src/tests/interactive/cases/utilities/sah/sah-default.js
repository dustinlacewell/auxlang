// sah - defaults
// Sample noise as pitch CV
clock(120)
  .seq("c4*4")
  .apply(s =>
    noise()
      .sah(s.trig)
      .scale({
        from: -1,
        to: 1,
        min: 48,
        max: 72})
      .tri()
      .gain(s.gate.ar())
      .out())
