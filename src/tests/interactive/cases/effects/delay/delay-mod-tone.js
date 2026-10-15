// delay - modulated tone
// Tone sweeps 0.1 to 0.9: the repeats turn dark and muffled, then bright again
clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1500))
      .gain(s.gate.ad(0.005, 0.15))
      .delay({
        time: 0.25,
        feedback: 0.55,
        mix: 0.5,
        tone: lfo(0.15, 0.1, 0.9)})
      .out())
