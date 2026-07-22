// delay - modulated mix
// Mix varies 0.1 to 0.9 - dry to wet sweep
clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay({ time: 0.25, feedback: 0.5, mix: lfo(0.2, 0.1, 0.9) })
      .out())
