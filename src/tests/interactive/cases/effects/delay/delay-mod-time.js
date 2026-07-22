// delay - modulated time
// Delay time varies 0.01s to 0.03s - chorus effect
clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
      .delay({ time: lfo(0.3, 0.01, 0.03), feedback: 0.4, mix: 0.5 })
      .out())
