// quantize - modulated input
// Random frequencies quantized to blues
clock(180)
  .seq("c4*4")
  .apply(s =>
    noise()
      .sah(s.trig)
      .scale({
        from: -1,
        to: 1,
        min: 150,
        max: 600})
      .quantize({ scaleName: "blues" })
      .tri()
      .gain(s.gate.ar())
      .out())
