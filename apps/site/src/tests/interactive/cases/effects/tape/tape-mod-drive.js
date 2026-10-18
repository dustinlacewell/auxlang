// tape - modulated drive
// Drive varies 0 to 1 - clean repeats, then thick, rounded, compressed ones
clock(90)
  .seq("c3 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(hz(800))
      .gain(s.gate.ad(0.01, 0.2))
      .tape({
        drive: lfo(0.15, 0, 1),
        feedback: 0.45,
        mix: 0.55})
      .out())
