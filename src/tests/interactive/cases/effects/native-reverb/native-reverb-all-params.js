// nativeReverb - all params
// Large room with high damping
clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb({ room: 0.9, damp: 0.7, wet: 0.5, dry: 0.5 })
    .gain(0.3)
    .out()
)
