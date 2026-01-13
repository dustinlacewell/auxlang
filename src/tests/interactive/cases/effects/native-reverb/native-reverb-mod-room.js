// nativeReverb - modulated room
// Room size swept by LFO
clock(60)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.saw()
      .gain({ level: s.gate.adsr() })
      .nativeReverb({
        room: sin(0.1, 0.3, 0.9),
        damp: 0.5,
        wet: 0.4,
        dry: 0.6})
      .gain(0.3)
      .out())
