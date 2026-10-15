// spread - showcase
// Two 4-note chords, each voice echoing in its own place across the stereo field
clock(180)
  .seq("<[c4,e4,g4,b4] [d4,f4,a4,c5]>")
  .apply(s =>
    s.saw()
      .lpf(hz(2000))
      .gain(s.gate.ad(0.01, 0.15))
      .delay({ time: 0.2, feedback: 0.3, mix: 0.25 })
      .spread()
      .out())
