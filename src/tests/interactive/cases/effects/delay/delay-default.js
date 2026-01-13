// delay - defaults
// Plucky hit with default delay
clock(120)
  .seq("c4 ~ ~ ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(s.gate.ad({ attack: 0.005, decay: 0.15 }))
      .delay()
      .out()
  )
