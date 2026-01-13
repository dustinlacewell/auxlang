// nativeReverb - defaults
// WASM reverb with default settings
clock(60)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.saw()
      .gain({ level: s.gate.adsr() })
      .nativeReverb()
      .gain(0.3)
      .out())
