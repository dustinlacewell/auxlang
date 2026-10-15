// tape - showcase
// Lo-fi dub bass: driven, dark repeats that sag in pitch
clock(75)
  .seq("c2 ~ ~ ~ g2 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(600))
      .gain(s.gate.ad(0.01, 0.25))
      .tape({
        time: 0.4,
        feedback: 0.55,
        drive: 0.5,
        tone: 0.35,
        wow: 0.4,
        flutter: 0.2})
      .out())
