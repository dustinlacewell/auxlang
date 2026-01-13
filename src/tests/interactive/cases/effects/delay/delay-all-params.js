// delay - all params
// All params specified - longer, darker delay
clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad(0.005, 0.15))
      .delay({
        time: 0.3,
        feedback: 0.55,
        mix: 0.45,
        tone: 0.4})
      .out())
