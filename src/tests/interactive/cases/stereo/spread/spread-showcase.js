// spread - showcase
// Wide 4-voice arpeggio across stereo field
clock(180)
  .seq("<{c4,e4,g4,b4} {d4,f4,a4,c5}>")
  .apply(s =>
    s.saw()
      .lpf(2000)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .spread()
      .delay({ time: 0.2, feedback: 0.3, mix: 0.25 })
      .out())
