// nativeReverb - modulated damp
// Damping swept by LFO
clock(60)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.saw()
      .gain({ level: s.gate.adsr() })
      .nativeReverb({
        room: 0.7,
        damp: sin(0.15, 0.2, 0.8),
        wet: 0.4,
        dry: 0.6})
      .gain(0.3)
      .out())
