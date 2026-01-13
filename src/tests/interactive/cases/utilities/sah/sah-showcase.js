// sah - showcase
// Random quantized melody
clock(180)
  .seq("c4*4")
  .apply(s =>
    sah({ input: noise(), trig: s.trig }).scale({
        from: -1,
        to: 1,
        min: 200,
        max: 800})
      .quantize({ scale: "minor pentatonic" })
      .tri()
      .gain({ level: s.gate.ar({ attack: 0.01, release: 0.1 }) })
      .out())
