// nativeReverb - modulated wet
// Wet level swept by LFO
clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb({ room: 0.7, damp: 0.5, wet: sin(0.2, 0.1, 0.6), dry: 0.7 })
    .gain(0.3)
    .out()
)
