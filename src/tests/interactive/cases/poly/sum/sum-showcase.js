// sum - showcase
// Summed chord with delay
clock(90)
  .seq("{c3,e3,g3} {d3,f3,a3}")
  .apply(s =>
    s.saw()
      .lpf(800, 0.2)
      .gain({ level: s.gate.adsr() })
      .sum()
      .delay({ time: 0.3, feedback: 0.4, mix: 0.3 })
      .gain(0.3)
      .out())
