// nativeReverb - modulated dry
// Dry level swept by LFO
clock(60)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.saw()
      .gain({ level: s.gate.adsr() })
      .nativeReverb({
        room: 0.7,
        damp: 0.5,
        wet: 0.4,
        dry: sin(0.2, 0.3, 0.9)})
      .gain(0.3)
      .out())
