// tape - all params
// All params specified - worn, driven tape: darker repeats with audible drift
clock(90)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1200))
      .gain(s.gate.ad(0.005, 0.15))
      .tape({
        time: 0.35,
        feedback: 0.5,
        mix: 0.5,
        drive: 0.5,
        wow: 0.5,
        flutter: 0.3,
        tone: 0.4})
      .out())
